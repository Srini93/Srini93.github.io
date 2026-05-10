import { MeshGradient } from '@paper-design/shaders-react';

/**
 * Mesh gradient header — matches Paper editor preset:
 * https://shaders.paper.design/mesh-gradient#colors=dde4ee,ffffff,f2f3f3,fff8f0&distortion=1&swirl=0.6&grainMixer=0&grainOverlay=0&speed=0.78&scale=0.64&rotation=90&offsetX=0&offsetY=0
 */
export function MeshGradientHeader() {
  return (
    <MeshGradient
      width="100%"
      height="100%"
      fit="cover"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      colors={['#dde4ee', '#ffffff', '#f2f3f3', '#fff8f0']}
      distortion={1}
      swirl={0.6}
      grainMixer={0}
      grainOverlay={0}
      speed={0.78}
      scale={0.64}
      rotation={90}
      offsetX={0}
      offsetY={0}
    />
  );
}
