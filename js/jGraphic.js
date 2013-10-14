/**
 * @description 基于canvas标签的GIS前台显示
 * @author 段松
 * @data 2013-7-9
 * @version 1.0  
*/
(function(window){
	var config = {
		radius:2,
		geoRange:{
			minX:70,
			maxX:138,
			minY:2,
			maxY:55
		},
		strokeStyle:'#000', //轮廓颜色
		lineWidth:1,        //线宽
		fillStyle:'#fff'    //填充颜色
	}
	var cache = {
		point:[],
		line : [],
		polygon : []
	}
	var jGraphic = function(setting){
		this.canvas = document.createElement("canvas");
		this.canvasHandler = document.createElement("canvas");
		this.statusPanel = document.createElement("div");
		this.setting={
			container:setting.container||"jMap",
			width:setting.width||500,
			height:setting.height||400
		}
		this.panel = document.getElementById(this.setting.container);
		this.context2D = this.canvas.getContext("2d");
		this.context3D = this.canvas.getContext("3d");
		this.contextH2D = this.canvasHandler.getContext("2d");
		this.contextH3D = this.canvasHandler.getContext("3d");
		this.statusEnum = {
			"one":"edit",
			"two":"visible",
			"three":"hide"
		};
		this.status = this.statusEnum["two"];
		this.eventList=[];   //记录canvas上绑定的方法列表其中为一个对象数组{type:type，fn:fn}
		this._init();	
	}
	jGraphic.prototype = {
		_init:function(){
			var p = this.setting;
			this.canvas.width = this.canvasHandler.width =  p.width;
			this.canvas.height = this.canvasHandler.height = p.height; 
			this.canvas.style.position = this.canvasHandler.style.position = "absolute"; 
			this.panel.style.position="relative";
			this.statusPanel.style.height="20px";
			this.statusPanel.style.top=p.height+"px";
			this.statusPanel.style.position="absolute";
			this.statusPanel.style.width="100%";
			this.statusPanel.style.borderTop = "1px solid #123456";
			this.panel.appendChild(this.canvas);
			this.panel.appendChild(this.canvasHandler); //专门用来存放鼠标轨迹的画布，所有跟鼠标有个的画图动作都在本图层进行，而canvas只负责存放画好的图形
			this.panel.appendChild(this.statusPanel);
		},
		/**
		 * util jGraphic中使用的工具集，建议将用到的工具集都写在最前面 
		 */
		isArray:function (obj) {
		    return '[object Array]' == Object.prototype.toString.call(obj);
		},
		isDate:function(obj) {
		    return {}.toString.call(obj) === "[object Date]" && obj.toString() !== 'Invalid Date' && !isNaN(obj);
		},
		isFunction:function (obj) {
		    return '[object Function]' == Object.prototype.toString.call(obj);
		},
		isNumber:function (obj) {
		    return '[object Number]' == Object.prototype.toString.call(obj) && isFinite(obj);
		},
		isObject:function (obj) {
		    return 'function' == typeof obj || !!(obj && 'object' == typeof obj);
		},
		isString:function (obj) {
		    return '[object String]' == Object.prototype.toString.call(obj);
		},
		isBoolean:function(obj) {
		    return typeof obj === 'boolean';
		},
		isUndefined:function(obj){
			return typeof obj ==='undefined';
		},
		bind:function(type,fn){
			document.attachEvent?this.canvasHandler.attachEvent("on"+type,fn):this.canvasHandler.addEventListener(type,fn,false);
		},
		unbind:function(type,fn){
			if(this.isUndefined(type)&&this.isUndefined(fn)){
				while(this.eventList.length!==0){
					var obj = this.eventList.shift();
					this.unbind(obj["type"],obj["fn"]);
				}
			}else{
				document.detachEvent?this.canvasHandler.detachEvent("on"+type,fn):this.canvasHandler.removeEventListener(type,fn,false);
			}
		},
		/**
		 *@ discription 计算节点偏离屏幕左边的距离
		 *@ param{Object} 要计算的节点
		 *@ result{Object} x顶部的距离 y偏离左边的距离
		 */
		Offset:function(obj){  
			var   offset={x:obj.offsetTop,y:obj.offsetLeft};   
			while(obj.offsetParent != null){  
			    obj = obj.offsetParent;     
				offset.x += obj.offsetTop; 
				offset.y += obj.offsetLeft;  
			}  
			return offset;  
		},
		//左边显示框
		showStatus:function(){
			var _this = this;
			this.bind("mousemove",function(event){
				var e = event||window.event;
				var offset = _this.Offset(_this.canvas);
				var screenCoor = {
					x:e.clientX-offset.x,
					y:e.clientY-offset.y
				};
				var geoCoor = _this.screenToGeo(screenCoor);	
				_this.statusPanel.innerHTML="x:"+geoCoor.x+",y:"+geoCoor.y;
			});
		},
		setStrokeStyle:function(color){
			config.strokeStyle = color;
			this.setPencil();
		},
		setLineWidth:function(width){
			config.lineWidth = width;
			this.setPencil();
		},
		setFillStyle:function(color){
			config.fillStyle = color;
			this.setPencil();
		},
		//在canvas上画图所用到的核心api
		setPencil:function(){
			var ctx = this.context2D;
			ctx.strokeStyle=config.strokeStyle;
			ctx.lineWidth = config.lineWidth;
			ctx.fillStyle = config.fillStyle;
		},
		/**
		 * @discription 绘制圆
		 * @param {Object}  data  绘制图片所需参数 x：圆心x坐标，y：圆心y坐标，radius：圆半径
		 * @callBack {function} 回调函数 
		*/
		drowArc:function(data){
			var ctx = this.context2D;
			ctx.beginPath();
		    ctx.arc(data.x,data.y,data.radius||config.radius,0,Math.PI*2, false);
		    ctx.stroke();
		    cache.point.push(data);
		},
		/**
		 * @discription 根据给定图片路径绘制图片
		 * @param {Object}  data  绘制图片所需参数 x：图片中心x坐标，y：图片中心y坐标，url：图片路径
		 * @callBack {function} 回调函数 
		*/
		drowImg:function(data,callBack){
			var	ctx = this.context2D;
				var img = new Image();
				img.onload=function(){
					ctx.drawImage(img,data.x,data.y);
					callBack();
				}
				img.src = data.url;
		},
		/**
		 * @discription 绘制线
		 * @param {Array}  data 数据格式参见说明文档
		*/
		drowLine:function(data){
			var ctx = this.context2D;
			ctx.beginPath();
			for(var i =0,max=data.length;i<max;i++){
				if(i===0){
					ctx.moveTo(data[i].x,data[i].y);
				}
				else{
					ctx.lineTo(data[i].x,data[i].y);
				}
			}
			ctx.stroke();
			cache.line.push(data);
		},
		/**
		 * @discription 绘制多边形
		 * @param {Array}  data 数据格式参见说明文档
		*/
		drowPolygon:function(data){
			var ctx = this.context2D;
			ctx.beginPath();
			for(var i =0,max=data.length;i<max;i++){
				if(i===0){
					ctx.moveTo(data[i].x,data[i].y);
				}
				else{
					ctx.lineTo(data[i].x,data[i].y);
				}
			}
			ctx.closePath();
			ctx.stroke(); 
			ctx.fill();
			cache.polygon.push(data);
		},
		/**
		 *设置图层为可编辑状态
		 */
		setEditeStatus:function(){
			this.status = this.statusEnum["one"];
			var _this = this;
			var  dragBegin =function(event){
				var e = event || window.event;
				var npt = {x:e.clientX,y:e.clientY};
				var flag = 0;
				for(var i=0,max=cache.point.length;i<max;i++){
					if(_this.isInPoint(npt,cache.point[i])){
						flag=i;
						break;
					}
				}
				if(flag){
					var dragMove = function(event){
					var e = event || window.event;
					cache.point[flag] = {x:e.clientX,y:e.clientY};
					_this.reDrow();
					}
					var dragEnd = function(event){
						_this.unbind("mousemove",dragMove);
						_this.unbind("mouseup",dragEnd);
					}				
					_this.bind("mousemove",dragMove);
					_this.bind("mouseup",dragEnd);
				}
			}
			_this.bind("mousedown",dragBegin);
			_this.eventList.push({type:"mousedown",fn:dragBegin});
			
		},
		/**
		 *设置图层为可见状态
		 */
		setVisibleStatus:function(){
			this.status = this.statusEnum["two"];
			_this.unbind();
		},
		/**
		 *设置图层为隐藏状态
		 */
		setHideStatus:function(){
			this.status = this.statusEnum["three"];
		},
		/**
		 *增加点方法 
		 */
		addPoint:function(){
			var _this = this;
			if(_this.status=="edit"){
				_this.unbind();
				var addPointClick=function(event){
					 var e = event || window.event; 
					 _this.drowArc({x:e.clientX,y:e.clientY});
				}
				_this.bind("click",addPointClick);
				_this.eventList.push({type:"click",fn:addPointClick});
			}
		},
		_addline:function(close){
			var data = [];
			if(this.status=="edit"){
				var _this = this,
					ctx = _this.context2D,
					ctxH = _this.contextH2D,
					position = {x:0,y:0};
				_this.unbind();
				var node = 0;
				var clickInterval=0;
				var addLineClick = function(event){
					clickInterval= setTimeout(function(){
						if(clickInterval){
							var e = event||window.event;
							if(node===0){
								ctx.beginPath();
								ctx.moveTo(e.clientX,e.clientY);
								data.push({x:e.clientX,y:e.clientY});
							}else{
								ctx.lineTo(e.clientX,e.clientY);
								data.push({x:e.clientX,y:e.clientY});
								ctx.stroke();
							}
							position = {x:e.clientX,y:e.clientY};
							node++;
						}
					},150)
				}
				var addLineMousemove = function(event){
					var e = event||window.event;
					if(node!==0){
						_this.clearCanvasH();
						ctxH.beginPath();
						ctxH.moveTo(position.x,position.y);
						ctxH.lineTo(e.clientX,e.clientY);
						ctxH.stroke();				
					}
				}
				var addLineDbclick=function(event){	
					clearInterval(clickInterval);
					clickInterval=0;
					var e = event||window.event;
					ctx.lineTo(e.clientX,e.clientY);
					data.push({x:e.clientX,y:e.clientY});
					if(close===true){
						ctx.closePath();
						if(data.length){
							cache.polygon.push(data);
						}
					}else{
						if(data.length){
							cache.line.push(data);
						}
					}
					ctx.stroke();				
					ctx.beginPath();
					node=0;
				}
				_this.bind("click",addLineClick);
				_this.bind("dblclick",addLineDbclick);
				_this.bind("mousemove",addLineMousemove);
				_this.eventList.push({type:"click",fn:addLineClick},{type:"dblclick",fn:addLineDbclick},{type:"mousemove",fn:addLineMousemove});
			}
		},
		/**
		 *增加线方法 
		 */
		addLine:function(){
			this._addline(false);
		},
		/**
		 * 增加画多边形方法 
		 */
		addPolygon:function(){
			this._addline(true);
		},
		/**
		 *  @discription 屏幕左边转地理坐标
		 */		
		screenToGeo:function(screenCoord){
			var p = this.setting,
				geoCoord={},
				geoRange = config.geoRange,
				scaleX = ((geoRange.maxX-geoRange.minX)*3600)/p.width,
				scaleY = ((geoRange.maxY-geoRange.minY)*3600)/p.height;
				geoCoord.x = screenCoord.x*scaleX/3600+geoRange.minX;
				geoCoord.y = geoRange.maxY-screenCoord.y*scaleY/3600;
			return geoCoord;
		},
		/**
		 *  @discription 地理坐标转屏幕坐标
		 */	
		 geoToScreen:function(geocoord){
		 	var p = this.setting,
				screenCoord={},
				geoRange = config.geoRange,
				scaleX = ((geoRange.maxX-geoRange.minX)*3600)/p.width,
				scaleY = ((geoRange.maxY-geoRange.minY)*3600)/p.height;
				screenCoord.x = (geocoord.x-geoRange.minX)*3600/scaleX;
				screenCoord.y = (geoRange.maxY-geocoord.y)*3600/scaleY;
			return screenCoord;
		 },
		 /**
		  * @discription根据缓存数据重绘 
		  */
		 reDrow:function(){
		 	this.context2D.clearRect(0,0,this.setting.width,this.setting.height);
		 	this.clearCanvasH();
		 	var point = cache.point,line=cache.line,polygon = cache.polygon;
		 	for(var i=0,max = point.length;i<max;i++){
		 		this.drowArc(point[i]);
		 	}
		 	for(var i=0,max = line.length;i<max;i++){
		 		this.drowLine(line[i]);
		 	}
		 	for(var i=0,max = polygon.length;i<max;i++){
		 		this.drowPolygon(polygon[i]);
		 	}
		 },
		 /**
		  * @discription 判断点是否在点内 
		  */
		 isInPoint:function(npt,opt){
		 	//var radius = config.radius||2;
		 	var radius = 10;
		 	if((Math.abs(npt.x-opt.x)<radius)&&(Math.abs(npt.y-opt.y)<radius)){
		 		return true;
		 	}else{
		 		return false;
		 	}
		 },
		/**
		 * @discription 清除画布内容
		*/
		clearCanvas:function(){
			this.context2D.clearRect(0,0,this.setting.width,this.setting.height);
			cache.point = [];
			cache.line = [];
			cache.polygon=[];
		},
		clearCanvasH:function(){
			this.contextH2D.clearRect(0,0,this.setting.width,this.setting.height);
		}
	}
	window.jGraphic=jGraphic;
})(window)
