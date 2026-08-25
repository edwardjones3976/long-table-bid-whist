export type XrDealerMode = "ai-dealer" | "human-host";
export type XrSupport = "checking" | "supported" | "unsupported";

interface XrViewportLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface XrViewLike {
  projectionMatrix: Float32Array;
  transform: { inverse: { matrix: Float32Array } };
}

interface XrPoseLike {
  views: XrViewLike[];
}

interface XrReferenceSpaceLike {}

interface XrFrameLike {
  session: XrSessionLike;
  getViewerPose(referenceSpace: XrReferenceSpaceLike): XrPoseLike | null;
}

interface XrLayerLike {
  framebuffer: WebGLFramebuffer | null;
  getViewport(view: XrViewLike): XrViewportLike | null;
}

interface XrSessionLike {
  renderState: { baseLayer?: XrLayerLike };
  requestReferenceSpace(type: "local-floor"): Promise<XrReferenceSpaceLike>;
  updateRenderState(state: { baseLayer: XrLayerLike }): void;
  requestAnimationFrame(callback: (time: number, frame: XrFrameLike) => void): number;
  addEventListener(type: "end", listener: () => void, options?: { once?: boolean }): void;
  end(): Promise<void>;
}

interface XrSystemLike {
  isSessionSupported(mode: "immersive-vr"): Promise<boolean>;
  requestSession(
    mode: "immersive-vr",
    options: {
      requiredFeatures: string[];
      optionalFeatures: string[];
      domOverlay: { root: Element };
    },
  ): Promise<XrSessionLike>;
}

interface XrGlContext extends WebGLRenderingContext {
  makeXRCompatible(): Promise<void>;
}

interface XrLayerConstructor {
  new (session: XrSessionLike, context: XrGlContext): XrLayerLike;
}

export interface XrSessionHandle {
  end(): Promise<void>;
}

export function immersiveSessionOptions(root: Element) {
  return {
    requiredFeatures: ["local-floor"],
    optionalFeatures: ["bounded-floor", "hand-tracking", "dom-overlay"],
    domOverlay: { root },
  };
}

function xrSystem(): XrSystemLike | null {
  const candidate = (navigator as Navigator & { xr?: XrSystemLike }).xr;
  return candidate ?? null;
}

export async function queryImmersiveVrSupport(): Promise<XrSupport> {
  const system = xrSystem();
  if (!system) return "unsupported";
  try {
    return (await system.isSessionSupported("immersive-vr")) ? "supported" : "unsupported";
  } catch {
    return "unsupported";
  }
}

function multiplyMat4(left: Float32Array, right: Float32Array): Float32Array {
  const output = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      output[column * 4 + row] =
        left[row] * right[column * 4] +
        left[4 + row] * right[column * 4 + 1] +
        left[8 + row] * right[column * 4 + 2] +
        left[12 + row] * right[column * 4 + 3];
    }
  }
  return output;
}

function modelMatrix(
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): Float32Array {
  return new Float32Array([
    scaleX, 0, 0, 0,
    0, scaleY, 0, 0,
    0, 0, scaleZ, 0,
    x, y, z, 1,
  ]);
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create XR shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Unable to compile XR shader");
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertex = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `
      attribute vec3 position;
      uniform mat4 matrix;
      void main() {
        gl_Position = matrix * vec4(position, 1.0);
      }
    `,
  );
  const fragment = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  );
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create XR program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Unable to link XR program");
  }
  return program;
}

const CUBE_VERTICES = new Float32Array([
  -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5,
  -0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
   0.5,-0.5,-0.5, -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,
   0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
  -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5,
  -0.5, 0.5, 0.5,  0.5, 0.5,-0.5, -0.5, 0.5,-0.5,
  -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5,
  -0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
   0.5,-0.5, 0.5,  0.5,-0.5,-0.5,  0.5, 0.5,-0.5,
   0.5,-0.5, 0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
  -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5,
  -0.5,-0.5,-0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5,
]);

function createRenderer(gl: XrGlContext, dealerMode: XrDealerMode) {
  const program = createProgram(gl);
  const position = gl.getAttribLocation(program, "position");
  const matrix = gl.getUniformLocation(program, "matrix");
  const color = gl.getUniformLocation(program, "color");
  const buffer = gl.createBuffer();
  if (!buffer || !matrix || !color) throw new Error("Unable to prepare XR geometry");

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTICES, gl.STATIC_DRAW);
  gl.useProgram(program);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
  gl.enable(gl.DEPTH_TEST);

  const drawCube = (
    projectionView: Float32Array,
    model: Float32Array,
    rgb: [number, number, number],
  ) => {
    gl.uniformMatrix4fv(matrix, false, multiplyMat4(projectionView, model));
    gl.uniform3fv(color, rgb);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  };

  return (projectionView: Float32Array) => {
    drawCube(projectionView, modelMatrix(0, -0.04, -1.5, 5, 0.04, 5), [0.035, 0.03, 0.025]);
    drawCube(projectionView, modelMatrix(0, 0.72, -1.45, 1.65, 0.1, 0.9), [0.08, 0.26, 0.2]);
    drawCube(projectionView, modelMatrix(0, 0.62, -1.45, 1.78, 0.06, 1.02), [0.24, 0.12, 0.07]);

    drawCube(projectionView, modelMatrix(0, 1.05, -2.22, 0.28, 0.38, 0.08), [0.43, 0.28, 0.12]);
    drawCube(projectionView, modelMatrix(-1.55, 1.02, -1.45, 0.08, 0.38, 0.28), [0.43, 0.28, 0.12]);
    drawCube(projectionView, modelMatrix(1.55, 1.02, -1.45, 0.08, 0.38, 0.28), [0.43, 0.28, 0.12]);

    if (dealerMode === "ai-dealer") {
      drawCube(projectionView, modelMatrix(0.85, 1.15, -2.05, 0.22, 0.18, 0.18), [0.18, 0.42, 0.52]);
      drawCube(projectionView, modelMatrix(0.85, 0.94, -2.05, 0.28, 0.26, 0.16), [0.12, 0.18, 0.2]);
    }
  };
}

export async function startImmersiveTable(
  root: Element,
  dealerMode: XrDealerMode,
  onEnded: () => void,
): Promise<XrSessionHandle> {
  const system = xrSystem();
  if (!system) throw new Error("Immersive WebXR is unavailable in this browser");

  const session = await system.requestSession("immersive-vr", immersiveSessionOptions(root));

  const canvas = document.createElement("canvas");
  canvas.className = "xr-layer-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: true,
    xrCompatible: true,
  }) as XrGlContext | null;
  if (!gl) {
    canvas.remove();
    await session.end();
    throw new Error("A WebGL XR layer could not be created");
  }

  await gl.makeXRCompatible();
  const Layer = (globalThis as typeof globalThis & { XRWebGLLayer?: XrLayerConstructor })
    .XRWebGLLayer;
  if (!Layer) {
    canvas.remove();
    await session.end();
    throw new Error("XRWebGLLayer is unavailable");
  }

  const layer = new Layer(session, gl);
  session.updateRenderState({ baseLayer: layer });
  const referenceSpace = await session.requestReferenceSpace("local-floor");
  const renderRoom = createRenderer(gl, dealerMode);
  let active = true;

  const cleanup = () => {
    active = false;
    canvas.remove();
    onEnded();
  };
  session.addEventListener("end", cleanup, { once: true });

  const onFrame = (_time: number, frame: XrFrameLike) => {
    if (!active) return;
    const baseLayer = frame.session.renderState.baseLayer;
    const pose = frame.getViewerPose(referenceSpace);
    if (baseLayer && pose) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, baseLayer.framebuffer);
      gl.clearColor(0.012, 0.01, 0.008, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      pose.views.forEach((view) => {
        const viewport = baseLayer.getViewport(view);
        if (!viewport) return;
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
        const projectionView = multiplyMat4(
          view.projectionMatrix,
          view.transform.inverse.matrix,
        );
        renderRoom(projectionView);
      });
    }
    session.requestAnimationFrame(onFrame);
  };
  session.requestAnimationFrame(onFrame);

  return {
    end: () => session.end(),
  };
}
