# yolov5-flask-detection-api
基于YOLOv5+Flask的目标检测Web API系统，支持单/多文件批量检测与可视化
# 基于YOLOv5+Flask的目标检测Web API系统

## 项目简介
这是我在《Linux基础及应用》课程设计中独立完成的项目，针对深度学习模型落地难、无标准化调用接口的痛点，在Ubuntu系统上完成了YOLOv5目标检测模型的部署，开发了可通过Web访问的目标检测服务，实现单/多文件批量检测、结果可视化与边界框动态绘制。

## 技术栈
- 操作系统：Ubuntu 20.04/22.04
- 编程语言：Python 3.10
- 深度学习框架：PyTorch (CPU版本)
- Web框架：Flask
- 核心库：OpenCV、NumPy、Flask-CORS
- 前端：HTML + CSS + JavaScript

## 项目功能
1.  **环境部署**：基于Anaconda创建隔离的Python虚拟环境，完成YOLOv5官方仓库克隆、依赖安装与预训练模型推理测试；
2.  **API接口开发**：基于Flask框架开发3个核心RESTful接口：
    - `/test`：API连通性测试接口；
    - `/detect/single`：单文件上传检测接口；
    - `/detect/multi`：多文件批量检测接口；
3.  **前端交互**：开发配套HTML前端界面，实现图片拖放上传、检测结果可视化、边界框动态绘制与类别统计；
4.  **跨域支持**：通过Flask-CORS解决前后端跨域请求失败的问题。

## 项目效果
- 系统单张图片推理耗时≤50ms；
- API接口请求成功率100%；
- 支持JPG/PNG等主流图片格式；
- 可稳定处理批量检测请求，前端界面交互流畅。

## 遇到的问题与解决方法
1.  **国内镜像源依赖安装失败**：初期直接用官方源安装PyTorch和YOLOv5依赖，因网络超时失败。后来更换为清华/阿里的Anaconda镜像源，解决了依赖安装问题；
2.  **模型加载路径错误**：Flask应用启动时提示“找不到模型文件”，后来将相对路径改为绝对路径，并确认了`torch.hub.load`的路径参数指向正确的`yolov5/weights/yolov5s.pt`，解决了问题；
3.  **前后端跨域请求失败**：前端界面访问API时提示“Cross-Origin Request Blocked”，后来引入`flask_cors`扩展，添加`CORS(app)`，解决了跨域问题。

## 后续优化方向
目前系统使用CPU进行推理，检测速度较慢，后续计划：
1.  添加GPU支持（修改`device = torch.device('cuda')`），提升模型推理速度；
2.  引入模型量化技术（如TensorRT），减少计算开销，提升实时性；
3.  添加视频流检测功能，支持实时摄像头画面目标检测；
4.  使用Docker容器化部署，解决环境依赖冲突问题，提升部署效率。

## 运行说明
### 1. 环境配置
```bash
# 克隆YOLOv5官方仓库
git clone https://github.com/ultralytics/yolov5
cd yolov5

# 创建并激活虚拟环境
conda create -n yolov5-flask python=3.10 -y
conda activate yolov5-flask

# 安装依赖
pip install torch torchvision torchaudio cpuonly -c pytorch
pip install -r requirements.txt
pip install flask flask-cors scipy h5py
