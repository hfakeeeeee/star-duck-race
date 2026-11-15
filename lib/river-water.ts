import type * as T from "three";

// Shared by the water vertices and floating ducks, so they ride the same swell.
export function riverHeight(x: number, z: number, t: number) {
  return -.04 + .08 * Math.sin(x * .63 + z * .37 - t * 1.55)
    + .045 * Math.sin(x * -.31 + z * 1.18 - t * 1.1)
    + .025 * Math.sin(x * 1.7 + z * .82 - t * 2.2);
}

export function createRiverWater(THREE: typeof T, night: boolean, sunset: boolean, winter: boolean) {
  const time = { value: 0 };
  const material = new THREE.MeshStandardMaterial({
    color: night ? "#123b57" : sunset ? "#238598" : winter ? "#2786a2" : "#197c91",
    roughness: .24, metalness: .12,
  });
  const waves = `
    uniform float uRiverTime;
    varying vec3 vRiverPosition;
    vec3 riverWave(vec2 p) {
      vec3 phases = vec3(dot(p,vec2(.63,.37))-uRiverTime*1.55,
        dot(p,vec2(-.31,1.18))-uRiverTime*1.1,
        dot(p,vec2(1.7,.82))-uRiverTime*2.2);
      vec3 slopes = cos(phases)*vec3(.08,.045,.025);
      return vec3(dot(sin(phases),vec3(.08,.045,.025)),
        dot(slopes,vec3(.63,-.31,1.7)),dot(slopes,vec3(.37,1.18,.82)));
    }
  `;
  material.onBeforeCompile = shader => {
    shader.uniforms.uRiverTime = time;
    shader.uniforms.uRiverSky = { value: new THREE.Color(night ? "#658bb7" : sunset ? "#e4bb98" : "#b3dae7") };
    shader.vertexShader = waves + shader.vertexShader
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        vec3 wave = riverWave(position.xz + vec2(80.,0.));
        objectNormal = normalize(vec3(-wave.y,1.,-wave.z));`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        transformed.y += wave.x;
        vRiverPosition = (modelMatrix * vec4(transformed,1.)).xyz;`);
    shader.fragmentShader = waves + `
      uniform vec3 uRiverSky;
      float riverHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float riverNoise(vec2 p) {
        vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(riverHash(i),riverHash(i+vec2(1,0)),f.x),
          mix(riverHash(i+vec2(0,1)),riverHash(i+vec2(1,1)),f.x),f.y);
      }
    ` + shader.fragmentShader
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        vec2 rp=vRiverPosition.xz;
        float fineA=dot(rp,vec2(4.8,2.7))-uRiverTime*2.5;
        float fineB=dot(rp,vec2(-2.4,6.3))-uRiverTime*3.1;
        vec2 micro=cos(fineA)*vec2(.064,.036)+cos(fineB)*vec2(-.024,.063);
        normal=normalize(normal+mat3(viewMatrix)*vec3(-micro.x,0.,-micro.y));
        float fresnel=pow(1.-max(0.,dot(normal,normalize(vViewPosition))),3.);
        float eddy=riverNoise(rp*vec2(.42,1.3)+vec2(uRiverTime*.23,0.));
        float ripple=sin(rp.y*6.5+sin(rp.x*2.1-uRiverTime*.8)*1.4-uRiverTime*2.);
        float crest=smoothstep(.88,.99,ripple)*smoothstep(.42,.75,eddy);
        float shore=smoothstep(11.6,13.,abs(rp.y));
        float foam=crest*.15 + shore*(.12+.28*eddy);
        diffuseColor.rgb *= .82+eddy*.27;
        diffuseColor.rgb=mix(diffuseColor.rgb,uRiverSky,fresnel*.6);
        diffuseColor.rgb=mix(diffuseColor.rgb,uRiverSky,foam);
        roughnessFactor=mix(.19,.34,foam);
      `);
  };
  return { material, time };
}
