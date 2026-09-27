"""ADPList public API helpers for mentorship booking in chat."""

from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

AUTH_SERVICE_URL = os.environ.get("ADPLIST_AUTH_SERVICE_URL", "https://api.adplist.org")
MEETINGS_SERVICE_URL = os.environ.get("ADPLIST_MEETINGS_SERVICE_URL", "https://api.adplist.org")
MENTOR_SLUG = os.environ.get("ADPLIST_MENTOR_SLUG", "srini-chakkarapani")
DEFAULT_DAYS = 14
MAX_DAYS = 30
MAX_SLOTS = 8

BOOKING_INTENT_RE = re.compile(
    r"\b(book(?:ing)?|session|availability|schedule|meet(?:ing)?|"
    r"office hours?|1[:\-]1|one[\s-]on[\s-]one|calendar|slot|available|time(?:s)?)\b",
    re.IGNORECASE,
)

REVIEW_INTENT_RE = re.compile(
    r"\b(review(?:s)?|rating(?:s)?|feedback|testimonial(?:s)?|what (?:do )?(?:people|mentees) say)\b",
    re.IGNORECASE,
)

MENTORSHIP_TOPICS_RE = re.compile(
    r"\b(topic(?:s)?|help with|mentor(?:s|ing)? on|what can .* ask)\b",
    re.IGNORECASE,
)

ADPLIST_GENERAL_RE = re.compile(
    r"\b(adplist|mentor(?:ship)?|mentee)\b",
    re.IGNORECASE,
)

MAX_REVIEWS = 4
REVIEW_TEXT_MAX_CHARS = 280

BOOKING_SUGGESTIONS = [
    "What topics can Srini help with on ADPList?",
    "Show Srini's next available mentorship times",
    "How should I prepare for a session with Srini?",
]

MENTORSHIP_TOPICS_ANSWER = (
    "Srini can help with product design, UI/visual design, interaction design, design systems, "
    "Generative AI in product design, developer experience, and career growth for designers."
)

MENTORSHIP_TOPICS_SUGGESTIONS = [
    "How should I prepare for a session with Srini?",
    "Show Srini's next available mentorship times",
    "What do mentees say about Srini's mentorship?",
]


def detect_booking_intent(message: str) -> bool:
    return bool(BOOKING_INTENT_RE.search((message or "").strip()))


def detect_review_intent(message: str) -> bool:
    return bool(REVIEW_INTENT_RE.search((message or "").strip()))


def detect_adplist_general_intent(message: str) -> bool:
    return bool(ADPLIST_GENERAL_RE.search((message or "").strip()))


def detect_mentorship_topics_intent(message: str) -> bool:
    text = (message or "").strip()
    return bool(ADPLIST_GENERAL_RE.search(text) and MENTORSHIP_TOPICS_RE.search(text))


def detect_adplist_intent(message: str) -> bool:
    text = (message or "").strip()
    return detect_booking_intent(text) or detect_review_intent(text) or detect_adplist_general_intent(text)


def _as_record(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _text_of(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _labels_of(value: Any) -> str:
    items = value if isinstance(value, list) else [] if value is None else [value]
    labels: list[str] = []
    for item in items:
        if isinstance(item, str):
            text = item.strip()
            if text:
                labels.append(text)
            continue
        record = _as_record(item)
        for key in (
            "name",
            "expertise",
            "discipline",
            "motivation",
            "interest",
            "language",
            "seniority",
            "skill",
            "title",
            "label",
            "value",
        ):
            text = _text_of(record.get(key))
            if text:
                labels.append(text)
                break
    return ", ".join(labels)


def _split_labels(labels: str) -> list[str]:
    return [part for part in labels.split(", ") if part] if labels else []


def _truncate(value: str, max_len: int) -> str:
    if len(value) <= max_len:
        return value
    return f"{value[: max_len - 1].rstrip()}…"


def _format_slot(epoch_seconds: int, tz_name: str) -> str:
    dt = datetime.fromtimestamp(epoch_seconds, tz=timezone.utc)
    return dt.strftime("%a, %b %d %I:%M %p UTC")


async def get_mentor_profile(client: httpx.AsyncClient, slug: str = MENTOR_SLUG) -> dict[str, Any]:
    url = f"{AUTH_SERVICE_URL.rstrip('/')}/users/profile/mentor/{slug.strip()}"
    response = await client.get(url, headers={"Accept": "application/json"})
    if response.status_code == 404:
        raise RuntimeError(f'No ADPList mentor found for slug "{slug}".')
    response.raise_for_status()
    data = _as_record(response.json().get("data"))
    if not data:
        raise RuntimeError(f'No ADPList mentor found for slug "{slug}".')

    profile = _as_record(data.get("profile"))
    experiences = _as_record(data.get("experiences"))
    preferences = _as_record(data.get("preferences"))
    country = _as_record(data.get("country"))
    is_meta = _as_record(data.get("is"))

    ranked = experiences.get("rankedExpertise")
    ranked_items = ranked if isinstance(ranked, list) else []
    expertise = _labels_of(experiences.get("expertise")) or _labels_of(
        [(_as_record(item).get("expertise")) for item in ranked_items]
    )

    clean_slug = _text_of(data.get("slug")) or slug
    user_id = _text_of(data.get("userId"))
    return {
        "user_id": user_id,
        "slug": clean_slug,
        "name": _text_of(data.get("fullName")),
        "title": _text_of(profile.get("title")),
        "employer": _text_of(profile.get("organization")),
        "country": _text_of(country.get("countryName")),
        "bio": _truncate(_text_of(data.get("bio")), 1200),
        "image": _text_of(profile.get("image")),
        "expertise": _split_labels(expertise),
        "disciplines": _split_labels(_labels_of(experiences.get("disciplines"))),
        "languages": _split_labels(_labels_of(preferences.get("languages"))),
        "open_to": _split_labels(_labels_of(preferences.get("openTo") or preferences.get("interests"))),
        "on_break": is_meta.get("onBreak") is True,
        "experience_level": _labels_of(experiences.get("experienceLevel")),
        "profile_url": f"https://adplist.org/mentors/{clean_slug}",
        "booking_url": f"https://adplist.org/mentors/{clean_slug}",
    }


async def list_availability(
    client: httpx.AsyncClient,
    slug: str = MENTOR_SLUG,
    days: int = DEFAULT_DAYS,
) -> dict[str, Any]:
    normalized_days = min(MAX_DAYS, max(1, int(days or DEFAULT_DAYS)))
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=normalized_days)
    url = f"{MEETINGS_SERVICE_URL.rstrip('/')}/availability/{slug.strip()}"
    response = await client.get(
        url,
        params={"startDate": now.date().isoformat(), "endDate": end.date().isoformat()},
        headers={"Accept": "application/json"},
    )
    response.raise_for_status()
    payload = response.json()
    tz_name = payload.get("timezone") or "UTC"

    all_slots: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for session in payload.get("sessions") or []:
        session_obj = _as_record(session)
        session_id = session_obj.get("sessionId")
        for slot in session_obj.get("slots") or []:
            slot_obj = _as_record(slot)
            start_epoch = slot_obj.get("startEpoch")
            if session_id and isinstance(start_epoch, (int, float)):
                all_slots.append((session_obj, slot_obj))

    all_slots.sort(key=lambda pair: float(pair[1]["startEpoch"]))
    seen: set[int] = set()
    deduped: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for session_obj, slot_obj in all_slots:
        epoch = int(slot_obj["startEpoch"])
        if epoch in seen:
            continue
        seen.add(epoch)
        deduped.append((session_obj, slot_obj))

    slots: list[dict[str, Any]] = []
    for session_obj, slot_obj in deduped[:MAX_SLOTS]:
        start_epoch = int(slot_obj["startEpoch"])
        end_epoch = int(slot_obj["endEpoch"]) if isinstance(slot_obj.get("endEpoch"), (int, float)) else start_epoch + 30 * 60
        slots.append(
            {
                "mentor_slug": slug,
                "session_id": session_obj["sessionId"],
                "slot_iso": datetime.fromtimestamp(start_epoch, tz=timezone.utc).isoformat(),
                "slot_local_display": _format_slot(start_epoch, session_obj.get("callerTimezone") or tz_name),
                "duration_minutes": max(1, round((end_epoch - start_epoch) / 60)),
            }
        )

    return {"slots": slots, "truncated": len(deduped) > MAX_SLOTS, "timezone": tz_name}


def _format_review_date(iso: str) -> str:
    if not iso:
        return ""
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%b %Y")
    except ValueError:
        return ""


async def fetch_mentor_stats(client: httpx.AsyncClient, user_id: str) -> dict[str, Any]:
    if not user_id:
        return {"average_rating": None, "reviews_count": None}
    try:
        response = await client.get(
            f"{AUTH_SERVICE_URL.rstrip('/')}/users/statistics",
            params={"userId": user_id, "type": "mentor"},
            headers={"Accept": "application/json"},
        )
        if response.status_code != 200:
            return {"average_rating": None, "reviews_count": None}
        reviews = _as_record(response.json().get("data")).get("reviews")
        reviews_obj = _as_record(reviews)
        avg = reviews_obj.get("averageRating")
        count = reviews_obj.get("reviewsCount")
        return {
            "average_rating": round(float(avg), 2) if isinstance(avg, (int, float)) else None,
            "reviews_count": int(count) if isinstance(count, (int, float)) else None,
        }
    except Exception:
        return {"average_rating": None, "reviews_count": None}


async def fetch_mentor_reviews(client: httpx.AsyncClient, user_id: str) -> list[dict[str, Any]]:
    if not user_id:
        return []
    try:
        response = await client.get(
            f"{AUTH_SERVICE_URL.rstrip('/')}/users/review",
            params={"userId": user_id, "type": "mentor", "target": "for", "limit": MAX_REVIEWS},
            headers={"Accept": "application/json"},
        )
        if response.status_code != 200:
            return []
        data = response.json().get("data")
        items = data if isinstance(data, list) else _as_record(data).get("reviews")
        if not isinstance(items, list):
            return []
        reviews: list[dict[str, Any]] = []
        for item in items[:MAX_REVIEWS]:
            record = _as_record(item)
            if not _text_of(record.get("review")) or record.get("status") == "inactive":
                continue
            reviewer = _as_record(record.get("reviewedByUser"))
            created = record.get("createdOn")
            iso = ""
            if isinstance(created, (int, float)) and created > 0:
                iso = datetime.fromtimestamp(created / 1000, tz=timezone.utc).isoformat()
            tags = record.get("tags")
            reviews.append(
                {
                    "rating": record.get("rating") if isinstance(record.get("rating"), (int, float)) else None,
                    "text": _truncate(_text_of(record.get("review")), REVIEW_TEXT_MAX_CHARS),
                    "date_iso": iso,
                    "date_display": _format_review_date(iso),
                    "reviewer_name": _text_of(reviewer.get("name")) or "ADPList mentee",
                    "reviewer_title": _text_of(reviewer.get("title")),
                    "reviewer_org": _text_of(reviewer.get("organization")),
                    "reviewer_image": _text_of(reviewer.get("image")),
                    "tags": [str(tag) for tag in tags][:4] if isinstance(tags, list) else [],
                }
            )
        return reviews
    except Exception:
        return []


async def get_booking_context(client: httpx.AsyncClient, slug: str = MENTOR_SLUG) -> dict[str, Any]:
    profile = await get_mentor_profile(client, slug)
    availability, stats, reviews = await asyncio.gather(
        list_availability(client, slug),
        fetch_mentor_stats(client, profile["user_id"]),
        fetch_mentor_reviews(client, profile["user_id"]),
    )
    return {"profile": profile, "availability": availability, "stats": stats, "reviews": reviews}


def build_adplist_prompt_context(booking: dict[str, Any]) -> str:
    profile = booking["profile"]
    availability = booking["availability"]
    stats = booking.get("stats") or {}
    reviews = booking.get("reviews") or []
    lines = [
        "LIVE ADPLIST MENTOR DATA (authoritative for booking questions):",
        f"- Mentor: {profile['name']} ({profile['title']} at {profile['employer']})",
        f"- ADPList profile: {profile['profile_url']}",
        f"- Disciplines: {', '.join(profile['disciplines']) or 'Product design and related areas'}",
    ]
    if profile["expertise"]:
        lines.append(f"- Expertise: {', '.join(profile['expertise'])}")
    if profile["open_to"]:
        lines.append(f"- Open to mentoring on: {', '.join(profile['open_to'])}")
    if stats.get("average_rating") is not None and stats.get("reviews_count"):
        lines.append(
            f"- ADPList rating: {stats['average_rating']}/5 from {stats['reviews_count']} reviews"
        )
    if reviews:
        lines.append("- Recent mentee reviews (paraphrase briefly; do not invent quotes):")
        for review in reviews[:3]:
            rating = f"{review['rating']}/5" if review.get("rating") is not None else "rated"
            lines.append(f"  • {review['reviewer_name']} ({rating}): \"{review['text']}\"")
    if profile["on_break"]:
        lines.append("- Srini is currently on break on ADPList; mention that and link to his profile.")
    elif not availability["slots"]:
        lines.append("- No open slots in the next two weeks; invite the visitor to check his ADPList profile.")
    else:
        lines.append("- Upcoming open slots (visitor must finish booking on ADPList):")
        for slot in availability["slots"][:5]:
            lines.append(f"  • {slot['slot_local_display']} ({slot['duration_minutes']} min)")
    lines.extend(
        [
            "- Booking happens on ADPList after sign-in. Do not claim a session is booked inside this chat.",
            "- When relevant, mention Srini offers free mentorship on ADPList and include his profile link.",
        ]
    )
    return "\n".join(lines)


def booking_suggestions(
    profile: dict[str, Any],
    availability: dict[str, Any],
    *,
    review_intent: bool = False,
    booking_intent: bool = True,
) -> list[str]:
    if review_intent and not booking_intent:
        return [
            "Can I book a session with Srini?",
            "What topics does Srini mentor on?",
            "What is Srini's design philosophy?",
        ]
    if profile.get("on_break"):
        return [
            "Is Srini taking new mentees on ADPList?",
            "What does Srini mentor on?",
            "What is Srini's current role at Intuit?",
        ]
    if not availability.get("slots"):
        return [
            "What can I ask Srini about in a mentorship session?",
            "What is Srini's design philosophy?",
            "Tell me about Srini's work at Intuit",
        ]
    return BOOKING_SUGGESTIONS


def build_companion_answer(
    *,
    review_intent: bool = False,
    booking_intent: bool = False,
    reviews: list | None = None,
    slots: list | None = None,
    show_slots: bool = True,
    show_reviews: bool = True,
) -> str:
    reviews = reviews or []
    slots = slots or []
    has_reviews = len(reviews) > 0
    has_slots = len(slots) > 0

    # Pure review intent
    if review_intent and not booking_intent:
        if has_reviews:
            return "Here's what mentees say about sessions with Srini on ADPList."
        return "Srini mentors on ADPList but reviews aren't available right now."

    # Pure booking intent
    if booking_intent and not review_intent:
        if has_slots:
            return "Srini offers free mentorship on ADPList — pick a time below to book."
        return "Srini mentors on ADPList. No open slots right now, but check his profile for updates."

    # Both intents or general ADPList query
    if has_slots and has_reviews:
        return "Srini mentors on ADPList. See reviews and book a free session below."
    if has_slots:
        return "Srini offers free mentorship on ADPList — pick a time below."
    if has_reviews:
        return "Srini mentors on ADPList. See what mentees say below."
    return "Srini mentors on ADPList — see his profile below."


def build_adplist_widget_payload(
    booking: dict[str, Any],
    *,
    review_intent: bool = False,
    booking_intent: bool = False,
) -> dict[str, Any]:
    profile = booking["profile"]
    availability = booking["availability"]
    stats = booking.get("stats") or {"average_rating": None, "reviews_count": None}
    all_reviews = booking.get("reviews") or []
    all_slots = availability["slots"]
    has_reviews = len(all_reviews) > 0
    has_slots = len(all_slots) > 0

    # Dynamic display logic:
    # - Pure review intent → show reviews, hide slots
    # - Pure booking intent → show slots, hide reviews
    # - Both intents or neither (general query) → show both
    show_slots = has_slots if (booking_intent or (not review_intent and not booking_intent)) else False
    show_reviews = has_reviews if (review_intent or (not review_intent and not booking_intent)) else False

    slots = all_slots if show_slots else []
    reviews = all_reviews if show_reviews else []

    return {
        "mentor_slug": profile["slug"],
        "name": profile["name"],
        "title": profile["title"],
        "employer": profile["employer"],
        "image": profile["image"],
        "bio": profile["bio"],
        "disciplines": profile["disciplines"][:6],
        "expertise": profile["expertise"][:6],
        "profile_url": profile["profile_url"],
        "booking_url": profile["booking_url"],
        "on_break": profile["on_break"],
        "stats": stats,
        "reviews": reviews,
        "show_slots": show_slots,
        "show_reviews": show_reviews,
        "slots": slots,
        "timezone": availability["timezone"],
        "companion_answer": build_companion_answer(
            review_intent=review_intent,
            booking_intent=booking_intent,
            reviews=reviews,
            slots=slots,
            show_slots=show_slots,
            show_reviews=show_reviews,
        ),
    }
