import type * as T from "three";

export const TRACK_LENGTH = 160;
export const START_NOSE_X = -3.25; // Behind the entire striped band, whose back edge is -2.55.
export const raceWorldX = (progress: number) => START_NOSE_X + progress * (TRACK_LENGTH - START_NOSE_X);

export function configureOverview(camera: T.OrthographicCamera, aspect: number, viewportHeight = 620) {
  // Portrait uses the long side of the screen for the course. Both views retain
  // a true rectangular plan, with equal scale on the two ground axes.
  const portrait = aspect < 1;
  const portraitPadding = viewportHeight / Math.max(180, viewportHeight - 250);
  const halfWidth = portrait ? Math.max(92 * aspect * portraitPadding, 32) : Math.max(92, 32 * aspect);
  const halfHeight = halfWidth / aspect;
  camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfHeight; camera.bottom = -halfHeight;
  camera.position.set(80, 130, 0); camera.up.set(portrait ? 1 : 0, 0, portrait ? 0 : -1);
  camera.lookAt(80, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}

export function followCameraPose(focalX: number, focalZ: number, mobile: boolean) {
  const x = Math.min(TRACK_LENGTH + 7, Math.max(START_NOSE_X, focalX)) + (mobile ? 0 : 2);
  // Matching X coordinates eliminate yaw: banks stay horizontal and the camera
  // pitches only around the course axis, with a fixed world-up vector.
  return { position: [x, mobile ? 13 : 9, focalZ + (mobile ? 30 : 23)] as const, target: [x, .4, focalZ] as const };
}
