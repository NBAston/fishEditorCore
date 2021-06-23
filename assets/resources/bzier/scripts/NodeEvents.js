let NodeEvents = (function () {
    let _this = {};
    //移动目标节点
    let moveTargetNode = null;
    let isMouseDown = null;
    let isOperate = true;

    // 屏幕坐标转换到节点坐标
    function convertToNodeSpace(event) {
        return glGame.editor.node.getChildByName("deskUI").convertToNodeSpaceAR(event.getLocation());
        // return cc.find("Canvas").convertToNodeSpaceAR(event.getLocation());
    }

    // 是否能删除
    function isDelete(node) {
        return node.ident == lcl.Ident.point;
    }
    // 是否在绘制区域
    function atDrawingArea(pos) {
        let resolution = lcl.BezierData.getResolution();
        let halfW = resolution.width / 2;
        let halfH = resolution.height / 2;

        return pos.x > -halfW && pos.x < halfW &&
            pos.y > -halfH && pos.y < halfH
    }

    // 是否能拖拽
    function isDragMove(mousePos, target) {
        let flag = false;
        switch (target.ident) {
            case lcl.Ident.point:
            case lcl.Ident.control:
                flag = atDrawingArea(mousePos)
                break;
            case lcl.Ident.window:
                flag = true;

        }
        // console.log(target.name, target.ident);
        return flag;
    }

    _this.setMoveTargetNode = function (target) {
        moveTargetNode = target;
    }
    _this.setOperateStatus = function (bol) {
        isOperate = bol;
    }
    // 添加拖拽事件
    _this.addDragEvents = function (node, target = node) {
        // 鼠标按下
        node.on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            if(glGame.Ctrl){
                return
            }
            event.stopPropagation();
            // 鼠标右键
            if (event.getButton() == cc.Event.EventMouse.BUTTON_LEFT /**&& _this.isOperate()**/) {
                moveTargetNode = target;
                isMouseDown = true;
            }
        });
        let move = (event) => {
            //鼠标按下并且有指定目标节点
            if (isMouseDown && moveTargetNode) {
                target.opacity = 100;
                cc.game.canvas.style.cursor = "all-scroll";
                //把屏幕坐标转换到节点坐标下
                let mousePos = convertToNodeSpace(event);
                if (isDragMove(mousePos, moveTargetNode))
                    moveTargetNode.setPosition(mousePos);
            }else{
                cc.game.canvas.style.cursor = "auto";
            }
        }
        // 鼠标移动
        // node.on(cc.Node.EventType.MOUSE_MOVE, move);
        node.parent.on(cc.Node.EventType.MOUSE_MOVE, move);
        // 鼠标离开
        node.on(cc.Node.EventType.MOUSE_LEAVE, (event) => {
            target.opacity = 255;
            cc.game.canvas.style.cursor = "auto";
           
        });
        let up = (event) => {
            isMouseDown = false;
            moveTargetNode = null;
            cc.game.canvas.style.cursor = "auto";
        }
        // 鼠标抬起
        //node.parent.on(cc.Node.EventType.MOUSE_UP, up);
        node.on(cc.Node.EventType.MOUSE_UP, up);
    }

    // 添加节点的删除事件
    _this.addPointDeleteEvents = function (node) {
        // 鼠标按下
        node.on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            if(glGame.Ctrl){
                return
            }
            // 鼠标右键
            if (event.getButton() == cc.Event.EventMouse.BUTTON_RIGHT) {
                // if (isDelete(event.target)) {
                    event.isShowPointMenuDeleteAndTime = isDelete(event.target);
                    event.target.pos = convertToNodeSpace(event);
                    // this.deleteTarget = event.target;
                    lcl.BezierData.setDeleteTarget(event.target);
                    lcl.Events.emit("showPointMenuView", event);
                // }
                return
            }
        });

    }

    // 添加Canvas节点事件
    _this.addCanvasTouchEvents = function (canvasNode = cc.find("Canvas")) {
        let target;
        // 鼠标按下
        canvasNode.on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            glGame.currDownEvent = event;
            if(glGame.Ctrl){
                return
            }
            if(!glGame.currentFish){
                glGame.editor.status("请创建一条鱼",glGame.Color.RED);
                return;
            }

            if (event.getButton() == cc.Event.EventMouse.BUTTON_RIGHT) {
                event.stopPropagation();
                let leftClickMenu = glGame.editor.node.getChildByName("leftClickMenu");
                // leftClickMenu.setPosition(event.getLocation());
                leftClickMenu.setPosition(convertToNodeSpace(event));
                leftClickMenu.active = true;
            }
            // 鼠标左键
            if (event.getButton() == cc.Event.EventMouse.BUTTON_LEFT) {
                event.stopPropagation();
                let leftClickMenu = glGame.editor.node.getChildByName("leftClickMenu");
                leftClickMenu.active = false;
                return;

            }
        });
        // 添加node
        canvasNode.on("addNewPoint", (event) => {
            event.stopPropagation();
            if(event.bzierData == null){
                target = event.target;
                //创建坐标点,需要先把屏幕坐标转换到节点坐标下
                let mousePos = convertToNodeSpace(event);
                if (!atDrawingArea(mousePos))
                    return
                if (!isOperate)
                    lcl.Events.emit("hidePointMenuView");

                // 二阶
                if (lcl.BezierData.getBezierCurveType() == lcl.BezierCurveType.SecondOrder) {
                    lcl.BezierData.createCurve(mousePos);
                    cc.warn(">>> 二阶 ----- ")
                }
                glGame.isAdd = true;
                // 三阶
                if (lcl.BezierData.getBezierCurveType() == lcl.BezierCurveType.ThirdOrder) {
                    lcl.BezierData.createThirdOrderCurve(mousePos);
                    cc.warn(">>> 三阶 ----- ")
                }
                isMouseDown = true;
                // glGame.drawBezier.saveDataToFishPointList();//保存数据 到 FishPointList
                // cc.warn(">>>222 加点 结束，保存！")
            }else{
                if (!isOperate)
                    lcl.Events.emit("hidePointMenuView");

                glGame.isAdd = true;
                // 二阶
                if (lcl.BezierData.getBezierCurveType() == lcl.BezierCurveType.SecondOrder) {
                    lcl.BezierData.createCurve(null,event.bzierData);
                }
                isMouseDown = true;
            }

        });
        // 鼠标移动
        canvasNode.on(cc.Node.EventType.MOUSE_MOVE, (event) => {

            if(!glGame.currentFish){
                glGame.editor.status("请创建一条鱼",glGame.Color.RED);
                return;
            }
            target = event.target;
            //创建坐标点,需要先把屏幕坐标转换到节点坐标下
            let mousePos = convertToNodeSpace(event);
            lcl.Events.emit("setMouseLocation", mousePos);

            //鼠标按下并且有指定目标节点
            if (isMouseDown && moveTargetNode && isDragMove(mousePos, moveTargetNode)) {
                moveTargetNode.setPosition(mousePos);
            }
        });
        // 鼠标抬起
        canvasNode.on(cc.Node.EventType.MOUSE_UP, (event) => {
            if(!glGame.currentFish){
                glGame.editor.status("请创建一条鱼",glGame.Color.RED);
                return;
            }
            target = event.target;
            isMouseDown = false;
            moveTargetNode = null;
            // glGame.drawBezier.saveDataToFishPointList()//保存数据 到 FishPointList
        });
    }
    return _this;
}());

module.exports = NodeEvents;
