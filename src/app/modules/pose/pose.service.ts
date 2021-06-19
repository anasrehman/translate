import {Injectable} from '@angular/core';
import * as holistic from '@mediapipe/holistic/holistic.js';
import * as drawing from '@mediapipe/drawing_utils/drawing_utils.js';
import {Pose, PoseLandmark} from './pose.state';

const IGNORED_BODY_LANDMARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22];

@Injectable({
  providedIn: 'root'
})
export class PoseService {

  model?: any;

  async load(): Promise<void> {
    this.model = new holistic.Holistic({
      locateFile: (file) => {
        console.log('Holistic', 'loading', file);
        return `assets/models/holistic/${file}`;
      }
    });

    this.model.setOptions({
      upperBodyOnly: false,
      modelComplexity: 1
    });
  }

  async predict(video: HTMLVideoElement): Promise<void> {
    if (!this.model) {
      return Promise.resolve(null);
    }
    await this.model.send({image: video}); // This is void
  }

  drawBody(landmarks: PoseLandmark[], ctx: CanvasRenderingContext2D): void {
    const filteredLandmarks = Array.from(landmarks);
    for (const l of IGNORED_BODY_LANDMARKS) {
      delete filteredLandmarks[l];
    }

    drawing.drawConnectors(ctx, filteredLandmarks, holistic.POSE_CONNECTIONS, {color: '#00FF00'});
    drawing.drawLandmarks(ctx, filteredLandmarks, {color: '#00FF00', fillColor: '#FF0000'});
  }

  drawHand(landmarks: PoseLandmark[], ctx: CanvasRenderingContext2D, lineColor: string, dotColor: string, dotFillColor: string): void {
    drawing.drawConnectors(ctx, landmarks, holistic.HAND_CONNECTIONS, {color: lineColor});
    drawing.drawLandmarks(ctx, landmarks, {
      color: dotColor,
      fillColor: dotFillColor,
      lineWidth: 2,
      radius: (landmark) => {
        return drawing.lerp(landmark.z, -0.15, .1, 10, 1);
      }
    });
  }

  drawFace(landmarks: PoseLandmark[], ctx: CanvasRenderingContext2D): void {
    drawing.drawConnectors(ctx, landmarks, holistic.FACEMESH_TESSELATION, {color: '#C0C0C070', lineWidth: 1});
    drawing.drawConnectors(ctx, landmarks, holistic.FACEMESH_RIGHT_EYE, {color: '#FF3030'});
    drawing.drawConnectors(ctx, landmarks, holistic.FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
    drawing.drawConnectors(ctx, landmarks, holistic.FACEMESH_LEFT_EYE, {color: '#30FF30'});
    drawing.drawConnectors(ctx, landmarks, holistic.FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
    drawing.drawConnectors(ctx, landmarks, holistic.FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
    drawing.drawConnectors(ctx, landmarks, holistic.FACEMESH_LIPS, {color: '#E0E0E0'});
  }

  drawConnect(connectors, ctx: CanvasRenderingContext2D): void {
    for (const connector of connectors) {
      const from = connector[0];
      const to = connector[1];
      if (from && to) {
        if (from.visibility && to.visibility &&
          (from.visibility < 0.1 || to.visibility < 0.1)) {
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(from.x * ctx.canvas.width, from.y * ctx.canvas.height);
        ctx.lineTo(to.x * ctx.canvas.width, to.y * ctx.canvas.height);
        ctx.stroke();
      }
    }
  }

  drawElbowHandsConnection(pose: Pose, ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = 5;

    if (pose.rightHandLandmarks) {
      ctx.strokeStyle = '#00FF00';
      this.drawConnect([[pose.poseLandmarks[holistic.POSE_LANDMARKS.RIGHT_ELBOW], pose.rightHandLandmarks[0]]], ctx);
    }

    if (pose.leftHandLandmarks) {
      ctx.strokeStyle = '#FF0000';
      this.drawConnect([[pose.poseLandmarks[holistic.POSE_LANDMARKS.LEFT_ELBOW], pose.leftHandLandmarks[0]]], ctx);
    }
  }

  draw(pose: Pose, ctx: CanvasRenderingContext2D): void {
    if (pose.poseLandmarks) {
      this.drawBody(pose.poseLandmarks, ctx);
      this.drawElbowHandsConnection(pose, ctx);
    }

    if (pose.leftHandLandmarks) {
      this.drawHand(pose.leftHandLandmarks, ctx, '#CC0000', '#FF0000', '#00FF00');
    }

    if (pose.rightHandLandmarks) {
      this.drawHand(pose.rightHandLandmarks, ctx, '#00CC00', '#00FF00', '#FF0000');
    }

    if (pose.faceLandmarks) {
      this.drawFace(pose.faceLandmarks, ctx);
    }

    ctx.restore();
  }
}
