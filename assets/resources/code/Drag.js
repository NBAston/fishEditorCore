cc.Class({
    extends: cc.Component,

    properties: {
        isSelf: {
            default: false,
            displayName: "拖自己or父类",
            tooltip: "拖动自己 true 父类 false",
            type: cc.boolean,
        },
        isEnterCtrl: {
            default: false,
            displayName: "是否要按下Ctrl",
            tooltip: " true 需要 false不需要",
            type: cc.boolean,
        },
    },
    start () {
        this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
            this.opacity = 255;
            if(this.node.parent.getComponent(cc.Widget)){
                this.node.parent.getComponent(cc.Widget).enabled = false;
            }
            var delta = event.touch.getDelta();
            if(this.isEnterCtrl){
                if(!glGame.Ctrl){
                    return;
                }
            }
            if(this.isSelf){
                this.node.x += delta.x;
                this.node.y += delta.y;
            }else{
                this.node.parent.x += delta.x;
                this.node.parent.y += delta.y;
            }
        }, this.node);
    },
});
