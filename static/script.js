javascript
// static/script.js
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const imageInput = document.getElementById('imageInput');
  const filePreview = document.getElementById('filePreview');
  const previewContainer = document.getElementById('previewContainer');
  const actionButtons = document.getElementById('actionButtons');
  const detectButton = document.getElementById('detectButton');
  const clearButton = document.getElementById('clearButton');
  const resultsSection = document.getElementById('resultsSection');
  const resultsContainer = document.getElementById('resultsContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
  let selectedFiles = [];
  let detectionResults = [];
  
  // 初始化拖放功能
  initDragDrop();
  
  // 初始化按钮事件
  dropZone.querySelector('button').addEventListener('click', () => {
    imageInput.click();
  });
  
  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });
  
  detectButton.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      showLoading(true);
      await performDetection();
      showResults();
    } catch (error) {
      console.error('检测失败:', error);
      showError('检测失败', error.message);
    } finally {
      showLoading(false);
    }
  });
  
  clearButton.addEventListener('click', () => {
    clearSelection();
  });
  
  // 拖放功能实现
  function initDragDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function highlight() {
      dropZone.classList.add('active');
    }
    
    function unhighlight() {
      dropZone.classList.remove('active');
    }
    
    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    }
  }
  
  // 处理选择的文件
  function handleFiles(files) {
    if (files.length === 0) return;
    
    // 过滤非图片文件
    const validFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (validFiles.length === 0) {
      showError('无效的文件', '请选择图片文件 (JPG, PNG, GIF 等)');
      return;
    }
    
    // 清除之前的选择
    clearSelection();
    
    // 添加新选择的文件
    selectedFiles = validFiles;
    renderFilePreviews();
    
    // 显示操作按钮
    actionButtons.classList.remove('hidden');
  }
  
  // 渲染文件预览
  function renderFilePreviews() {
    filePreview.classList.remove('hidden');
    previewContainer.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item bg-white rounded-lg shadow-md overflow-hidden';
      previewItem.innerHTML = `
        <div class="relative">
          <img src="${URL.createObjectURL(file)}" alt="${file.name}" class="w-full h-48 object-cover">
          <button class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity delete-btn" data-index="${index}">
            <i class="fa fa-times"></i>
          </button>
        </div>
        <div class="p-3">
          <p class="text-sm font-medium text-gray-800 truncate">${file.name}</p>
          <p class="text-xs text-gray-500">${formatFileSize(file.size)}</p>
        </div>
      `;
      
      previewContainer.appendChild(previewItem);
      
      // 添加删除按钮事件
      previewItem.querySelector('.delete-btn').addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        selectedFiles.splice(index, 1);
        renderFilePreviews();
        
        if (selectedFiles.length === 0) {
          clearSelection();
        }
      });
    });
  }
  
  // 执行目标检测
  async function performDetection() {
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await fetch('http://localhost:5000/detect/multi', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    detectionResults = await response.json();
    
    if (!detectionResults || !detectionResults.results) {
      throw new Error('无效的API响应格式');
    }
  }
  
  // 显示检测结果
  function showResults() {
    resultsSection.classList.remove('hidden');
    resultsContainer.innerHTML = '';
    
    if (detectionResults.results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div class="flex">
            <div class="flex-shrink-0">
              <i class="fa fa-exclamation-triangle text-yellow-500"></i>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-yellow-800">未检测到目标</h3>
              <div class="mt-2 text-sm text-yellow-700">
                <p>没有在上传的图片中检测到任何目标。请尝试上传其他图片。</p>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }
    
    detectionResults.results.forEach(result => {
      const resultCard = document.createElement('div');
      resultCard.className = 'result-card bg-white rounded-xl shadow-md overflow-hidden';
      
      // 构建检测类别统计
      const classCounts = {};
      result.detections.forEach(detection => {
        if (classCounts[detection.name]) {
          classCounts[detection.name]++;
        } else {
          classCounts[detection.name] = 1;
        }
      });
      
      const classSummary = Object.entries(classCounts)
        .map(([name, count]) => `${name} (${count})`)
        .join(', ');
      
      resultCard.innerHTML = `
        <div class="p-4 border-b border-gray-100">
          <div class="flex justify-between items-center">
            <h4 class="font-medium text-gray-800">${result.filename}</h4>
            <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              ${result.detection_count} 个目标
            </span>
          </div>
          <p class="text-sm text-gray-600 mt-1">${classSummary}</p>
        </div>
        <div class="relative">
          <img src="/static/${result.image_path}" alt="检测结果" class="w-full h-64 object-cover">
          <!-- 边界框将通过JS动态添加 -->
        </div>
        <div class="p-4">
          <h5 class="font-medium text-gray-800 mb-2">详细检测结果</h5>
          <div class="space-y-2 max-h-60 overflow-y-auto pr-2">
            ${result.detections.map(detection => `
              <div class="flex items-center p-2 bg-gray-50 rounded">
                <div class="w-2 h-2 rounded-full mr-2" style="background-color: ${getColorForClass(detection.class)}"></div>
                <div class="flex-1">
                  <span class="font-medium text-gray-800">${detection.name}</span>
                  <span class="text-xs text-gray-500 ml-2">置信度: ${Math.round(detection.confidence * 100)}%</span>
                </div>
                <div class="text-xs text-gray-500">
                  位置: (${Math.round(detection.bounding_box[0])}, ${Math.round(detection.bounding_box[1])})
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      resultsContainer.appendChild(resultCard);
      
      // 为图片添加边界框
      const imageContainer = resultCard.querySelector('.relative');
      const image = imageContainer.querySelector('img');
      
      // 等待图片加载完成以获取正确尺寸
      image.onload = () => {
        addBoundingBoxes(imageContainer, result.detections, image.naturalWidth, image.naturalHeight);
      };
    });
  }
  
  // 添加边界框到图片
  function addBoundingBoxes(container, detections, originalWidth, originalHeight) {
    const image = container.querySelector('img');
    const imageWidth = image.offsetWidth;
    const imageHeight = image.offsetHeight;
    
    const widthRatio = imageWidth / originalWidth;
    const heightRatio = imageHeight / originalHeight;
    
    detections.forEach(detection => {
      const [x1, y1, x2, y2] = detection.bounding_box;
      
      const box = document.createElement('div');
      box.className = 'bounding-box';
      box.style.left = `${x1 * widthRatio}px`;
      box.style.top = `${y1 * heightRatio}px`;
      box.style.width = `${(x2 - x1) * widthRatio}px`;
      box.style.height = `${(y2 - y1) * heightRatio}px`;
      box.style.borderColor = getColorForClass(detection.class);
      box.style.color = getColorForClass(detection.class);
      
      box.innerHTML = `
        <span>${detection.name} (${Math.round(detection.confidence * 100)}%)</span>
      `;
      
      container.appendChild(box);
    });
  }
  
  // 显示错误信息
  function showError(title, message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg';
    errorElement.innerHTML = `
      <div class="flex">
        <div class="flex-shrink-0">
          <i class="fa fa-exclamation-circle text-red-500"></i>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">${title}</h3>
          <div class="mt-2 text-sm text-red-700">
            <p>${message}</p>
          </div>
        </div>
      </div>
    `;
    
    resultsSection.classList.remove('hidden');
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(errorElement);
  }
  
  // 显示/隐藏加载指示器
  function showLoading(show) {
    if (show) {
      loadingIndicator.classList.remove('hidden');
    } else {
      loadingIndicator.classList.add('hidden');
    }
  }
  
  // 清除选择
  function clearSelection() {
    selectedFiles = [];
    detectionResults = [];
    filePreview.classList.add('hidden');
    previewContainer.innerHTML = '';
    actionButtons.classList.add('hidden');
    resultsSection.classList.add('hidden');
    resultsContainer.innerHTML = '';
  }
  
  // 格式化文件大小
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }
  
  // 为不同类别生成颜色
  function getColorForClass(classId) {
    const colors = [
      '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', 
      '#ec4899', '#4f46e5', '#14b8a6', '#f97316', '#a855f7',
      '#06b6d4', '#15803d', '#d97706', '#7e22ce', '#dc2626'
    ];
    return colors[classId % colors.length];
  }
});
