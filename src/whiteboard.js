import { add, del, listen, read } from "./firebase-service.js";
import { state, addSubscription } from "./app-state.js";
import { makeId, toast } from "./utils.js";

let canvas = null, ctx = null, drawing = false, currentStroke = null, tool = "pen", colorInput = null, sizeInput = null;

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;
  return { x: (source.clientX - rect.left) * (canvas.width / rect.width), y: (source.clientY - rect.top) * (canvas.height / rect.height) };
}

function drawStroke(stroke) {
  if (!stroke || !stroke.points || stroke.points.length < 2) return;
  ctx.beginPath();
  ctx.lineWidth = stroke.size || 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color || "#0f172a";
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  ctx.stroke();
}

export function redraw(strokesObj = {}) {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const strokes = Object.values(strokesObj || {}).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  for (const stroke of strokes) drawStroke(stroke);
}

export function subscribeWhiteboard() {
  const path = `rooms/${state.groupId}/phase${state.currentPhase}/whiteboard/strokes`;
  const unsub = listen(path, (strokes) => redraw(strokes || {}));
  addSubscription(unsub);
}

export async function loadWhiteboard() {
  const strokes = await read(`rooms/${state.groupId}/phase${state.currentPhase}/whiteboard/strokes`, {});
  redraw(strokes || {});
}

export function initWhiteboard() {
  canvas = document.getElementById("whiteboardCanvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  colorInput = document.getElementById("penColor");
  sizeInput = document.getElementById("penSize");

  const start = (event) => {
    event.preventDefault();
    drawing = true;
    const point = getCanvasPoint(event);
    currentStroke = { id: makeId("stroke"), author: state.memberId, tool, color: tool === "eraser" ? "#ffffff" : colorInput.value, size: Number(sizeInput.value || 4), points: [point], createdAt: Date.now() };
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };
  const move = (event) => {
    if (!drawing || !currentStroke) return;
    event.preventDefault();
    const point = getCanvasPoint(event);
    currentStroke.points.push(point);
    ctx.lineWidth = currentStroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = currentStroke.color;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };
  const end = async () => {
    if (!drawing || !currentStroke) return;
    drawing = false;
    const stroke = currentStroke;
    currentStroke = null;
    if (stroke.points.length < 2) return;
    await add(`rooms/${state.groupId}/phase${state.currentPhase}/whiteboard/strokes`, stroke);
  };
  canvas.onmousedown = start;
  canvas.onmousemove = move;
  window.onmouseup = end;
  canvas.ontouchstart = start;
  canvas.ontouchmove = move;
  canvas.ontouchend = end;
  document.getElementById("toolPen").onclick = () => { tool = "pen"; toast("Mode pensil aktif."); };
  document.getElementById("toolEraser").onclick = () => { tool = "eraser"; toast("Mode penghapus aktif."); };
  document.getElementById("clearBoard").onclick = async () => { await del(`rooms/${state.groupId}/phase${state.currentPhase}/whiteboard/strokes`); redraw({}); toast("Whiteboard dibersihkan."); };
}
