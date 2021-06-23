//系统拖拽类
cc.Class({
    extends: cc.Component,

    properties: {
    },
    onLoad(){
        this.dobbClick = 0;
        this.dobbClickTime = 0;
    },
    start () {
        this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
            if(window.ipcRenderer)window.ipcRenderer.send("movewindow_start");
        }, this.node);

        this.node.on(cc.Node.EventType.TOUCH_CANCEL, (event) => {
            if(window.ipcRenderer)window.ipcRenderer.send("movewindow_end");
        }, this.node);

        this.node.on(cc.Node.EventType.TOUCH_END, (event) => {
            if(window.ipcRenderer)window.ipcRenderer.send("movewindow_end");
        }, this.node);

        this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
            var delta = event.touch.getDelta();
            if(window.ipcRenderer)window.ipcRenderer.send("movewindow_move",{x:delta.x,y:delta.y});
        }, this.node);
        this.node.on(cc.Node.EventType.MOUSE_DOWN, (event) => {
            this.dobbClickTime = 0.1;
            this.dobbClick ++;
        }, this.node);
        this.node.on(cc.Node.EventType.MOUSE_UP, (event) => {
            this.dobbClick -= 10;
        }, this.node);
    },
    update(dt){
        if(this.dobbClickTime > 0){
            this.dobbClickTime += dt;

            if(this.dobbClickTime < 0.35 && this.dobbClick == -18){
                this.dobbClick = 0;
                this.dobbClickTime = 0;
                if(window.ipcRenderer)window.ipcRenderer.send("maxWindow");
            }

            if(this.dobbClickTime > 0.6){
                this.dobbClickTime = 0;
                this.dobbClick = 0;
            }
        }
    }
});
