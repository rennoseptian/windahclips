"""Robust Video Matting (onnxruntime CPU) -> matte grayscale mp4 (putih = subjek).
Pakai: python3 -I run_rvm.py SUMBER.mp4 rvm_mobilenetv3_fp32.onnx KELUARAN.mp4
Model: github.com/PeterL1n/RobustVideoMatting/releases (v1.0.0)."""
import sys, subprocess, numpy as np, cv2, onnxruntime as ort

src, model, out = sys.argv[1:4]
sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS)
W, H = 540, 540  # inferensi 540, matte di-upscale ke 1080
ds = np.array([0.5], dtype=np.float32)
st = [np.zeros((1, 1, 1, 1), np.float32) for _ in range(4)]
ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", "1080x1080",
                       "-r", str(fps), "-i", "-", "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", out],
                      stdin=subprocess.PIPE)
n = 0
while True:
    ok, fr = cap.read()
    if not ok: break
    x = cv2.cvtColor(cv2.resize(fr, (W, H)), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    x = x.transpose(2, 0, 1)[None]
    fgr, pha, *st = sess.run(None, {"src": x, "r1i": st[0], "r2i": st[1], "r3i": st[2], "r4i": st[3], "downsample_ratio": ds})
    m = (np.clip(pha[0, 0], 0, 1) * 255).astype(np.uint8)
    ff.stdin.write(cv2.resize(m, (1080, 1080), interpolation=cv2.INTER_CUBIC).tobytes())
    n += 1
ff.stdin.close(); ff.wait()
print(out, n, "frames")
