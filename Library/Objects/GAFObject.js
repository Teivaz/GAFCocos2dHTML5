var gaf = gaf || {};

gaf.CGAffineTransformCocosFormatFromFlashFormat = function(transform){
    var t = {};
    t.a = transform.a;
    t.b = -transform.b;
    t.c = -transform.c;
    t.d = transform.d;
    t.tx = transform.tx;
    t.ty = -transform.ty;
    return t;
};

gaf.Object = cc.Node.extend({
    _externalTransform : cc.affineTransformMake(),
    _asset : null,
    _className : "GAFObject",
    _id : gaf.IDNONE,


    // Public methods

    /**
     * @method setAnimationStartedNextLoopDelegate
     * @param {function(Object)} delegate
     */
    setAnimationStartedNextLoopDelegate : function (delegate) {},

    /**
     * @method setAnimationFinishedPlayDelegate
     * @param {function(Object)} delegate
     */
    setAnimationFinishedPlayDelegate : function (delegate) {},

    /**
     * @method setLooped
     * @param {bool} looped
     */
    setLooped : function (looped) {},

    /**
     * @method getBoundingBoxForCurrentFrame
     * @return {cc.Rect}
     */
    getBoundingBoxForCurrentFrame : function () {return cc.rect();},

    /**
     * @method setFps
     * @param {uint} fps
     */
    setFps : function (fps) {},

    /**
     * @method getObjectByName
     * @param {String} name - name of the object to find
     * @return {gaf.Object}
     */
    getObjectByName : function (name) {return null;},

    /**
     * @method clearSequence
     */
    clearSequence : function () {},

    /**
     * @method getIsAnimationRunning
     * @return {bool}
     */
    getIsAnimationRunning : function () {return false;},

    /**
     * @method gotoAndStop
     * @param {uint|String} value - label ot frame number
     * @return {bool}
     */
    gotoAndStop : function (value) {},

    /**
     * @method getStartFrame
     * @param {String} frameLabel
     * @return {uint}
     */
    getStartFrame : function (frameLabel) {return gaf.IDNONE;},

    /**
     * @method setFramePlayedDelegate
     * @param {function(Object, frame)} delegate
     */
    setFramePlayedDelegate : function (delegate) {},

    /**
     * @method getCurrentFrameIndex
     * @return {uint}
     */
    getCurrentFrameIndex : function () {return gaf.IDNONE;},

    /**
     * @method getTotalFrameCount
     * @return {uint}
     */
    getTotalFrameCount : function () {return 0;},

    /**
     * @method start
     */
    start : function () {},

    /**
     * @method stop
     */
    stop : function () {},

    /**
     * @method isVisibleInCurrentFrame
     * @return {bool}
     */
    isVisibleInCurrentFrame : function () {return false;},

    /**
     * @method isDone
     * @return {bool}
     */
    isDone : function () {return true;},

    /**
     * @method playSequence
     * @param {String} name - name of the sequence to play
     * @param {bool} looped - play looped. False by default
     * @param {bool} resume - whether to resume animation if stopped. True by default
     * @return {bool}
     */
    playSequence : function (name, looped, resume) {return false;},

    /**
     * @method isReversed
     * @return {bool}
     */
    isReversed : function () {return false;},

    /**
     * @method setSequenceDelegate
     * @param {function(Object, sequenceName)} delegate
     */
    setSequenceDelegate : function (delegate) {},

    /**
     * @method setFrame
     * @param {uint} index
     * @return {bool}
     */
    setFrame : function (index) {return false;},

    /**
     * @method setControlDelegate
     * @param {function} func
     */
    setControlDelegate : function (func) {},

    /**
     * @method getEndFrame
     * @param {String} frameLabel
     * @return {uint}
     */
    getEndFrame : function (frameLabel) {return gaf.IDNONE;},

    /**
     * @method pauseAnimation
     */
    pauseAnimation : function () {},

    /**
     * @method gotoAndPlay
     * @param {uint|String} value - label ot frame number
     * @return {bool}
     */
    gotoAndPlay : function (value) {},

    /**
     * @method isLooped
     * @return {bool}
     */
    isLooped : function () {return false;},

    /**
     * @method resumeAnimation
     */
    resumeAnimation : function () {},

    /**
     * @method setReversed
     * @param {bool} reversed
     */
    setReversed : function (reversed) {},

    /**
     * @method hasSequences
     * @return {bool}
     */
    hasSequences : function () {return false;},

    /**
     * @method getFps
     * @return {uint}
     */
    getFps : function () {return 60;},

    /**
     * @method setLocator
     * @param {bool} locator
     * Locator object will not draw itself, but its children will be drawn
     */
    setLocator : function (locator){},

    setExternalTransform : function(affineTransform){
        if(cc.affineTransformEqualToTransform(this.getExternalTransform(), affineTransform)){
            this._externalTransform = affineTransform;
            this._transformDirty = true;
            this._inverseDirty = true;
        }
    },

    getExternalTransform : function(){
        return this._externalTransform;
    },

    getNodeToParentTransform : function(){
        if(this._transformDirty){
            var scale = 1 / cc.Director.getInstance().getContentScaleFactor();
            if (scale !== 1){
                var transform = cc.affineTransformScale(this.getExternalTransform(), scale, scale);
                cc.CGAffineToGL(cc.affineTransformTranslate(transform, -this._anchorPointInPoints.x, -this._anchorPointInPoints.y), this._transform.m);
            }
            else{
                cc.CGAffineToGL(cc.affineTransformTranslate(this.getExternalTransform(), -this._anchorPointInPoints.x, -this._anchorPointInPoints.y), this._transform.m);
            }
            this._transformDirty = false;
        }
        return this._transform;
    },

    getNodeToParentAffineTransform : function(){
        if (this._transformDirty)
        {
            var transform = this.getExternalTransform();
            var scale = 1 / cc.Director.getInstance().getContentScaleFactor();
            if (scale !== 1)
            {
                transform = cc.affineTransformScale(transform, scale, scale);
            }

            cc.CGAffineToGL(cc.affineTransformTranslate(transform, -this._anchorPointInPoints.x, -this._anchorPointInPoints.y), this._transform.m);
            this._transformDirty = false;
        }
        cc.GLToCGAffine(this._transform.m, this.transform);

        return transform;
    },

    ////////////////
    // Private
    ////////////////

    _updateVisibility : function(state, parent){
        var alphaOffset = state.hasColorTransform ? 0 : state.colorTransform.alphaOffset;
        alphaOffset += parent ? parent._getDisplayedOpacityOffset() : 0;
        this._getDisplayedOpacityOffset = function(){return alphaOffset};
        this.setOpacity(state.alpha);
        return this.isVisible();
    },

    // @Override
    isVisible : function(){
        return (this.getDisplayedOpacity() > cc.FLT_EPSILON)
            || (this._getDisplayedOpacityOffset() > cc.FLT_EPSILON);
    },

    _getDisplayedOpacityOffset : function(){return 0},

    _getFilters : function(){return null},

    _processAnimation : function(){}


});

gaf.Object._createNullObject = function() {
    var ret = new gaf.Object();
    ret.isVisible = function(){return true};
    ret._updateVisibility = function(){};
    return ret;
};