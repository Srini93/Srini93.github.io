import { createRoot } from 'react-dom/client';
import { MeshGradientHeader } from './MeshGradientHeader';

const container = document.getElementById('mesh-gradient-container');
if (container) {
  const root = createRoot(container);
  root.render(<MeshGradientHeader />);
}
