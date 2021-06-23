window.lcl = {};
window.lcl.Bezier = require('./Bezier');
window.lcl.BezierData = require('./BezierData');
window.lcl.NodeEvents = require('./NodeEvents');
window.lcl.Events = require('./EventListener');
window.lcl.Ident = require('./Enum').Ident;
window.lcl.BezierCurveType = require('./Enum').BezierCurveType;

cc.Class({
    extends: cc.Component,
    // editor: {
    //     executeInEditMode: true,
    // },

    properties: {
        graphicsNode: cc.Node,
        box: cc.Node,
        point: cc.Prefab,//坐标点
        control: cc.Prefab,//控制点
        bezierColor: new cc.Color(255, 0, 0),// 贝塞尔曲线颜色
        lineColor: new cc.Color(0, 255, 255),//控制线段
        infoWindow: cc.Node,
        paper: cc.Node,
        msg: cc.Node,
        timeInfo: cc.Label,//实时运行时间
        mouseLocation: cc.Label,//鼠标坐标
        pointMenu: cc.Node,//点 右键菜单

    },

    onLoad() {
        glGame.drawBezier = this;
        this.currPoint = null;
    },
    clearCurrFishLine(){
        lcl.BezierData.clearAllBezier();
        lcl.NodeEvents.setMoveTargetNode(null);
    },
    startDraw(){
        glGame.drawStart = true;
        this.init();
        lcl.Events.on("setMouseLocation", this.setMouseLocation.bind(this));
        lcl.Events.on("showPointMenuView", this.showPointMenuView.bind(this));
        lcl.Events.on("hidePointMenuView", this.hidePointMenuView.bind(this));

        this.node.parent.on(cc.Node.EventType.MOUSE_UP, (event)=>{
            // cc.error("保存坐标点>>>>> 1");
            lcl.BezierData.saveBezierPath();//保存坐标点
            glGame.drawBezier.saveDataToFishPointList()//保存数据 到 FishPointList
        });
    },

    // 初始化
    init() {
        // 提示框
        this.infoWindow.zIndex = 10;
        this.notice = this.infoWindow.getChildByName("notice").getComponent(cc.Label);
        this.fileInputBox = this.infoWindow.getChildByName("Input").getChildByName("fileEditBox").getComponent(cc.EditBox);
        // 控制器面板
        let controlPanel = this.node.getChildByName("controlPanel");
        this.moveBtn = controlPanel.getChildByName("moveBtn");
        this.smoothnessInputBox = controlPanel.getChildByName("smoothnessInput").getChildByName("EditBox").getComponent(cc.EditBox);
        this.runTimeInputBox = controlPanel.getChildByName("runTimeInput").getChildByName("EditBox").getComponent(cc.EditBox);

        this.resolutionWidthInputBox = controlPanel.getChildByName("resolution").getChildByName("width").getComponent(cc.EditBox);
        this.resolutionHeightInputBox = controlPanel.getChildByName("resolution").getChildByName("height").getComponent(cc.EditBox);

        // 初始化Graphics
        this.initGraphics();
        this.initNodeEvents();
        this.hideInfoWindow();
        this.addPointMenuBtnEvents();
        this.initResolution();
        // 初始化贝塞尔曲线数据
        if(!glGame.isImport){
            lcl.BezierData.init(this.point, this.control, this.node, glGame.startPoint, glGame.controlPoint, glGame.endPoint);
        }
        // lcl.BezierData.setBezierCurveRunTime(Number(this.runTimeInputBox.string));
        // lcl.BezierData.saveBezierPath();
    },
    //从FishPointList 初始化贝塞尔数据 = glGame.FList[item]
    initDataFormFishPointList(fishData){
        if(!glGame.drawStart){
            this.startDraw();
        }
        lcl.BezierData.clearAllBezier();
        lcl.NodeEvents.setMoveTargetNode(null);
        for (let i = 0; i < fishData.posArray.length; i++) {
            let startPoint   = cc.v2(fishData.posArray[i].x    ,fishData.posArray[i].y);
            let startSpeed   = fishData.moveList[i];
            if(fishData.posArray[i + 1] == undefined || fishData.posArray[i + 2] == undefined){
                continue;
            }
            let controlPoint = cc.v2(fishData.posArray[i + 1].x,fishData.posArray[i + 1].y);
            let endPoint     = cc.v2(fishData.posArray[i + 2].x,fishData.posArray[i + 2].y);
            let controlSpeed   = fishData.moveList[i + 1];
            let endSpeed   = fishData.moveList[i + 2];
            i++;
            i++;
            if(i<3){
                glGame.startPoint   = startPoint;
                glGame.controlPoint = controlPoint;
                glGame.endPoint     = endPoint;
                lcl.BezierData.init(this.point, this.control, this.node, fishData.posArray[0], fishData.posArray[1], fishData.posArray[2],startSpeed,controlSpeed,endSpeed);
            }else{
                lcl.BezierData.createCurveForImport(startPoint,controlPoint,endPoint,startSpeed,controlSpeed,endSpeed);
            }
        }
    },
    //从缓存 初始化数据
    initDataToFishPointList(){
        // glGame.FListJson = JSON.parse(cc.sys.localStorage.getItem('glGame.FList'));
        // glGame.currGIndexJson = JSON.parse(cc.sys.localStorage.getItem('glGame.currGIndex'));
        // if(glGame.FListJson){
        //     glGame.editor.alert("是否读取上次的数据？",(a)=>{
        //         if(a){
        //             glGame.FList = glGame.FListJson;
        //             glGame.currGIndex = glGame.currGIndexJson;
        //             glGame.isImport = true;
        //             let list = glGame.FList[glGame.currGIndex].fishLine;
        //             if(list){
        //                 for (let fishID in list){
        //                     glGame.currLineItem = list[fishID];
        //                     glGame.editor.updateGroupToCanteinerAndFishLineToCanvas();
        //                     break;
        //                 }
        //             }
        //             glGame.editor.status("读取成功");
        //         }else{
        //             glGame.FListJson = null;
        //             glGame.currGIndexJson = null;
        //         }
        //     });
        // }
    },
    //保存数据 到 FishPointList
    saveDataToFishPointList(){
        this.path = lcl.BezierData.getBezierCurveLists();
        if(glGame.currentFish == undefined || glGame.currentFish.lineID == undefined){
            return;
        }
        let lineID = glGame.currentFish.lineID;
        if(lineID == undefined || this.path == undefined || this.path.length == 0){
            return;
        }

        if(glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].posArray.length > 3){
            if(glGame.RestoreFList == null){
                glGame.RestoreFList = [];
                glGame.RestoreIndex = 0;
            }
            glGame.RestoreFList.push(JSON.parse(JSON.stringify(glGame.FList)));
            while(glGame.RestoreFList.length > 10){
                glGame.RestoreFList.shift();
            }
            if(glGame.isAdd == true){
                glGame.RestoreIndex++;
                cc.error(">> 添加数据 "+glGame.RestoreIndex)
            }else{
                glGame.RestoreIndex--;
                cc.error(">> 删除数据 "+glGame.RestoreIndex)
            }
        }


        let rate   = glGame.FList[glGame.currGIndex].fishLine[lineID].rate;//配置表速度
        let d      = glGame.getPosArrayAndmoveList(this.path,lineID,rate);
        let posArray = d.posArray;
        let moveList = d.moveList;
        glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].runTime = glGame.getMaxIndexByTime(posArray, moveList);
        glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].posArray = posArray;
        glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].moveList = moveList;
        cc.sys.localStorage.setItem('glGame.FList', JSON.stringify(glGame.FList));
        cc.sys.localStorage.setItem('glGame.currGIndex', JSON.stringify(glGame.currGIndex));
    },
    getPostFormPath(i){
        let startPos    = {x: this.path[i]["start"].x,      y:this.path[i]["start"].y};
        let controlPos  = {x: this.path[i]["control"].x,    y:this.path[i]["control"].y};
        let endPos      = {x: this.path[i]["end"].x,        y:this.path[i]["end"].y};
        return {startPos:startPos,controlPos:controlPos,endPos:endPos}
    },

    update(dt) {
        if(!glGame.drawStart)return;
        lcl.NodeEvents.setOperateStatus(!this.pointMenu.active);
        this.drawBezierAll();
        if (this.isStartRun) {
            this.setCountTimeLabel(dt);
        }
    },

    // 初始化绘制区域
    initResolution(){
        this.resolution = lcl.BezierData.getResolution();
        this.resolutionWidthInputBox.string = this.resolution.width;
        this.resolutionHeightInputBox.string = this.resolution.height;
        this.setPaperSize();
    },
    // 初始化Graphics
    initGraphics() {
        this.ctx = this.graphicsNode.getComponent(cc.Graphics);
        this.ctx.lineWidth = 4;
    },

    
    initNodeEvents() {
        glGame.paintingArea = this.node.getChildByName("PaintingArea");
        lcl.NodeEvents.addCanvasTouchEvents(glGame.paintingArea);
    },

    // 绘制路线
    drawBezierAll() {
        this.ctx.clear();
        let bezierLists = lcl.BezierData.getBezierCurveLists();
        for (var i = 0, len = bezierLists.length; i < len; i++) {
            const curve = bezierLists[i];
            let n = Object.keys(curve).length;
            // 绘制二阶贝塞尔
            if (n == 3) {
                this.drawBezier(curve.start.position, curve.control.position, curve.end.position);
            }
            // 绘制三阶贝塞尔
            if (n == 4) {
                this.drawThirdOrderBezier(curve);
            }
        }
    },
    // 绘制贝塞尔曲线
    drawBezier(startPos, controlPos, endPos) {
        //画笔移动到起始点
        this.ctx.moveTo(startPos.x, startPos.y);
        //线条颜色
        this.ctx.strokeColor = this.bezierColor;
        //绘制贝塞尔曲线
        this.ctx.quadraticCurveTo(controlPos.x, controlPos.y, endPos.x, endPos.y);
        this.ctx.stroke();
        //画笔移动到起始点
        this.ctx.moveTo(endPos.x, endPos.y);
        this.ctx.strokeColor = this.lineColor;
        //绘制直线
        this.ctx.lineTo(controlPos.x, controlPos.y);
        this.ctx.stroke();
        //
    },

    // 绘制三阶贝塞尔曲线
    drawThirdOrderBezier(curve) {
        //绘制贝塞尔曲线
        this.ctx.moveTo(curve.start.x, curve.start.y);
        //线条颜色
        this.ctx.strokeColor = this.bezierColor;
        this.ctx.bezierCurveTo(curve.control1.x, curve.control1.y, curve.control2.x, curve.control2.y, curve.end.x, curve.end.y);
        this.ctx.stroke();
        //绘制辅助线1
        this.ctx.moveTo(curve.start.x, curve.start.y);
        this.ctx.strokeColor = this.lineColor;
        this.ctx.lineTo(curve.control1.x, curve.control1.y);
        this.ctx.stroke();
        //绘制辅助线2
        this.ctx.moveTo(curve.end.x, curve.end.y);
        this.ctx.lineTo(curve.control2.x, curve.control2.y);
        this.ctx.stroke();
    },

    addHideEvents(node) {
        node.on(cc.Node.EventType.MOUSE_MOVE, (event) => {
            this.hideMouseLocation()
        })
    },

    // 屏幕坐标转换到节点坐标
    convertToNodeSpace(event) {
        return this.node.convertToNodeSpaceAR(event.getLocation());
    },
    // ------------------------【删除节点】---------------------------
    addPointMenuBtnEvents() {
        this.pointMenu.getChildByName("btn_delete_pointMenu").on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            event.stopPropagation();
            if (event.getButton() == cc.Event.EventMouse.BUTTON_LEFT) {
                if (lcl.BezierData.isLastCurve()) {
                    this.showMsg("不能删除最后一个曲线!!");
                    return;
                }
                this.hidePointMenuView();
                glGame.isAdd = false;
                cc.error(">>> 删除节点 >>>> 1")
                lcl.BezierData.deletePoint();//删除坐标点
                // 重新保存下路径
                lcl.BezierData.saveBezierPath();//保存坐标点
                // cc.error("保存坐标点>>>>> 3");
            }
        })
        this.pointMenu.getChildByName("btn_submit_pointMenu").on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            event.stopPropagation();
            if (event.getButton() == cc.Event.EventMouse.BUTTON_LEFT) {
                this.hidePointMenuView();
            }
        })
        this.pointMenu.getChildByName("slider").on("slide", (slider) => {
            let speed = slider.progress * glGame.maxSpeed;
            this.pointMenu.getChildByName("editbox").getComponent(cc.EditBox).string = Number(speed.toFixed(2)) + "";
            this.currPoint.speed = speed;
        })
        this.pointMenu.getChildByName("editbox").on("text-changed", (editbox) => {
            let str = editbox.string;
            if(str == null || str == "" || isNaN(str)){//输入校验 必须输入合法的
                return;
            }
            this.currPoint.speed = Number(str) == 0 ? glGame.speed : Number(str);
            this.pointMenu.getChildByName("slider").getComponent(cc.Slider).progress = this.currPoint.speed/glGame.maxSpeed;//ui暂停使用
        })
    },

    // save按钮
    save() {
        if (this.fileInputBox.string == "") {
            this.setNoitce("文件名不能为空!");
            return
        }
        this.setNoitce('');
        this.computeBezierActions();
        this.saveBezierPathToJson(this.fileInputBox.string);
    },

    //保存为json数据
    saveBezierPathToJson(name) {
        if (cc.sys.isBrowser) {
            let datas = JSON.stringify(lcl.BezierData.getBezierCurveData());
            var textFileAsBlob = new Blob([datas], { type: 'application/json' });
            var downloadLink = document.createElement("a");
            downloadLink.download = name;
            downloadLink.innerHTML = "Download File";
            if (window.webkitURL != null) {
                // Chrome允许点击链接
                //而无需实际将其添加到DOM中。
                downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
            }
            else {
                //在点击之前 Firefox要求将链接添加到DOM中
                downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                downloadLink.onclick = destroyClickedElement;
                downloadLink.style.display = "none";
                document.body.appendChild(downloadLink);
            }
            downloadLink.click();
        }
    },
    // 
    computeBezierActions() {
        let bezierCurveData = lcl.BezierData.getBezierCurveData();
        this.actionLists = [];
        // 创建动作队列
        for (var i = 0, len = bezierCurveData.points.length; i < len; i++) {
            const point = bezierCurveData.points[i];
            //计算当前路段需要的时间
            let time = point.length / bezierCurveData.length * bezierCurveData.time;
            point.time = time;
            // 创建动作
            let action = cc.moveTo(time, cc.v2(point.x, point.y));
            this.actionLists.push(action);
        }
    },
    // 设置分辨率
    setResolution(str, event, ident) {
        console.log(str, event, ident);
        let num = Number(str);
        if (str == "" || isNaN(num)) {
            this.showMsg("分辨率只能填写数字！！！");
            event.string = this.resolution[ident];
            return
        }
        this.resolution[ident] = num;
        lcl.BezierData.setResolution(this.resolution.width, this.resolution.height);
        this.setPaperSize();
        lcl.BezierData.init(this.point, this.control, this.node);
    },
    setPaperSize(){
        this.paper.width = this.resolution.width;
        this.paper.height = this.resolution.height;
    },
    // 设置运行时间
    setRunTime(str) {
        let num = Number(str);
        if (str == "" || isNaN(num)) {
            this.showMsg("运行时间只能填写数字！！！");
            this.runTimeInputBox.string = this.prveRunTime || 2;
            return
        }
        this.prveRunTime = num;
        lcl.BezierData.setBezierCurveRunTime(num);
    },

    // 设置曲线平滑度
    setCurveSmoothness(str) {
        console.log(str);
        let num = Number(str);
        if (str == "" || isNaN(num)) {
            this.showMsg("曲线平滑度只能填写数字！！！");
            this.smoothnessInputBox.string = this.prvePointCount || 100;
            return
        }
        if (num < 0 || num > 1000) {
            this.showMsg("曲线平滑度取值范围在 0 - 1000！");
            this.smoothnessInputBox.string = this.prvePointCount || 100;
            return
        }
        this.prvePointCount = num;
        lcl.BezierData.setPointCount(num);
    },

    // 播放动画
    playBezierFishLine() {
        glGame.currentFish.getComponent("fish_Unit").editMove();
    },
    // 更新数据
    updateBezierFishLine() {
        glGame.currentFish.getComponent("fish_Unit").updateData();
    },


    // ------------------------【弹窗设置相关】---------------------------
    showInfoWindow() {
        this.infoWindow.active = true;
        this.setNoitce('');
    },
    hideInfoWindow() {
        this.infoWindow.active = false;
    },
    setNoitce(str) {
        this.notice.string = str;
    },
    showMsg(msg) {
        this.msg.active = true;
        this.msg.getComponent(cc.Label).string = msg
        setTimeout(() => {
            if (this.msg) {
                this.msg.active = false;
            }
        }, 1000);
    },
    // 开始计时
    startCountTime() {
        this.isStartRun = true;
        this.timeInfo.string = 0;
        this.currentRunTime = 0;
    },
    // 停止计时
    stopCountTime() {
        this.isStartRun = false;
    },
    setCountTimeLabel(dt) {
        this.currentRunTime = this.currentRunTime + dt;
        this.timeInfo.string = "run time: " + this.currentRunTime.toFixed(2) + "s";
    },

    // 显示删除按钮
    showPointMenuView(event) {
        glGame.editor.node.getChildByName("leftClickMenu").active = false;
        this.pointMenu.active = true;
        let pos = event.target.pos;
        if((pos.x+this.pointMenu.width) > this.paper.width/2){
            pos.x = pos.x - ((pos.x+this.pointMenu.width) - this.paper.width/2);
        }
        if((pos.y+this.pointMenu.height) > this.paper.height/2){
            pos.y = pos.y - ((pos.y+this.pointMenu.height) - this.paper.height/2);
        }
        if(pos.y < -342){
            pos.y = -342;
        }

        this.pointMenu.setPosition(event.target.pos);

        this.pointMenu.getChildByName("editbox").active = event.isShowPointMenuDeleteAndTime;
        this.pointMenu.getChildByName("btn_delete_pointMenu").active = event.isShowPointMenuDeleteAndTime;
        this.currPoint = event.target;
        let index = Number(this.currPoint.children[0].getComponent(cc.Label).string);
        let moveList = glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].moveList;
        let posArray = glGame.FList[glGame.currGIndex].fishLine[glGame.currentFish.lineID].posArray;
        let cuttTime;
        if(index == 0){//第一个  特殊处理
            cuttTime = moveList[index];
        }else{
            let isEnd = 3*(index/2);
            let lengthEnd = moveList.length - 1;
            if(lengthEnd == isEnd){//最后一个 特殊处理
                cuttTime = moveList[lengthEnd];
            }else{
                let newIndex = index + (index * 0.5) + 1;//中间的
                cuttTime = moveList[newIndex];
            }
        }
        if(this.currPoint.speed == undefined){
            if(cuttTime == undefined){
                cuttTime = glGame.speed;
            }
            this.currPoint.speed = cuttTime;//保存到node对象
            if(this.currPoint.speed == 0){
                this.currPoint.speed =  glGame.speed;
            }
        }
        // cc.error(">> index ",index)
        // cc.error(">> posArray ",posArray)
        // cc.error(">> node ",this.node)
        // cc.error(">> currPoint ",this.currPoint)
        this.pointMenu.getChildByName("editbox").getComponent(cc.EditBox).string = this.currPoint.speed+"";
        this.pointMenu.getChildByName("editboxX").getComponent(cc.EditBox).string = posArray[index].x+"";
        this.pointMenu.getChildByName("editboxY").getComponent(cc.EditBox).string = posArray[index].y+"";
        this.pointMenu.getChildByName("slider").getComponent(cc.Slider).progress = this.currPoint.speed/glGame.maxSpeed;//UI暂停使用
    },
    hidePointMenuView(evt,data) {
        if(data != undefined && data == 1){

        }else{
            this.currPoint.x = Number(this.pointMenu.getChildByName("editboxX").getComponent(cc.EditBox).string);
            this.currPoint.y = Number(this.pointMenu.getChildByName("editboxY").getComponent(cc.EditBox).string);
        }
        this.pointMenu.active = false;
        // glGame.drawBezier.saveDataToFishPointList();
    },
    //显示鼠标坐标
    setMouseLocation(pos) {
        this.mouseLocation.node.active = true
        this.mouseLocation.node.setPosition(pos);
        this.mouseLocation.string = `x:${pos.x.toFixed(0)} y:${pos.y.toFixed(0)}`;
    },
    //隐藏
    hideMouseLocation() {
        this.mouseLocation.node.active = false
    },

    // 曲线类型选择
    setCurveType(event) {
        console.log(event);
        lcl.BezierData.setBezierCurveType(event.node._name)
    }
});