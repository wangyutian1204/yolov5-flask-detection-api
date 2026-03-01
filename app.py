nano app.py

粘贴以下代码（注意：确保MODEL_PATH指向正确的模型路径）：
import os
import uuid
import json
import torch
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory, make_response
from werkzeug.utils import secure_filename
from flask_cors import CORS

# 配置上传文件夹和允许的文件类型
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
DETECTION_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'runs/detections')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# 确保文件夹存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DETECTION_FOLDER, exist_ok=True)

# 初始化Flask应用
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DETECTION_FOLDER'] = DETECTION_FOLDER

# 解决跨域问题
CORS(app)

# 加载YOLOv5模型
print("正在加载模型...")
device = torch.device('cpu')  # 使用CPU，如需GPU请修改为 'cuda'
model = torch.hub.load(
    '../yolov5',  # YOLOv5代码路径
    'custom',
    path='../yolov5/weights/yolov5s.pt',
    source='local',
    trust_repo=True
)
model = model.to(device)
model.eval()
print("模型加载完成")

def allowed_file(filename):
    """检查文件类型是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(filename):
    """生成唯一的文件名，避免冲突"""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    return unique_filename if ext else f"{unique_filename}.jpg"

def detect_image(image_path):
    """使用YOLOv5模型进行目标检测"""
    try:
        # 执行检测
        results = model(image_path)
        
        # 解析检测结果
        detections = []
        for *xyxy, conf, cls in results.xyxy[0].tolist():
            detections.append({
                "class": int(cls),
                "name": results.names[int(cls)],
                "confidence": float(conf),
                "bounding_box": [float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])]
            })
        
        # 保存检测结果图片
        results.save(save_dir=DETECTION_FOLDER)
        
        return detections
    except Exception as e:
        print(f"检测过程中发生错误: {e}")
        return []

@app.route('/')
def index():
    """返回前端页面"""
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """提供静态文件服务"""
    return send_from_directory('static', path)

@app.route('/test', methods=['GET'])
def test_api():
    """测试API连通性"""
    return jsonify({
        "status": "success",
        "message": "YOLOv5 API服务正在运行",
        "timestamp": str(torch.Tensor([0]).to(device).item())
    })

@app.route('/detect/single', methods=['POST'])
def detect_single():
    """单文件目标检测"""
    if 'file' not in request.files:
        return jsonify({"error": "没有文件部分"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "没有选择文件"}), 400
    
    if file and allowed_file(file.filename):
        try:
            # 生成唯一文件名并保存
            filename = generate_unique_filename(file.filename)
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(save_path)
            
            # 执行目标检测
            detections = detect_image(save_path)
            
            # 构建响应
            result_filename = os.path.basename(save_path)
            result_image_path = f"runs/detections/{result_filename}"
            
            return jsonify({
                "status": "success",
                "filename": result_filename,
                "detection_count": len(detections),
                "detections": detections,
                "image_path": result_image_path
            })
            
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"检测失败: {str(e)}"
            }), 500
    else:
        return jsonify({
            "error": "不支持的文件类型，允许格式: png, jpg, jpeg, gif"
        }), 400

@app.route('/detect/multi', methods=['POST'])
def detect_multi():
    """多文件目标检测"""
    if 'files' not in request.files:
        return jsonify({"error": "没有文件部分"}), 400
    
    files = request.files.getlist('files')
    if not files or all(file.filename == '' for file in files):
        return jsonify({"error": "没有选择文件"}), 400
    
    results = []
    try:
        for file in files:
            if file and allowed_file(file.filename):
                # 生成唯一文件名并保存
                filename = generate_unique_filename(file.filename)
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(save_path)
                
                # 执行目标检测
                detections = detect_image(save_path)
                
                # 构建单个文件结果
                result_filename = os.path.basename(save_path)
                result_image_path = f"runs/detections/{result_filename}"
                
                results.append({
                    "filename": result_filename,
                    "status": "success",
                    "detection_count": len(detections),
                    "detections": detections,
                    "image_path": result_image_path
                })
            else:
                results.append({
                    "filename": file.filename if file else "unknown",
                    "status": "error",
                    "message": "不支持的文件类型"
                })
        
        return jsonify({
            "status": "success",
            "total_files": len(files),
            "processed_files": len(results),
            "results": results
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"检测失败: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("启动Flask服务，访问 http://localhost:5000 测试")
    app.run(host='0.0.0.0', port=5000, debug=False)
