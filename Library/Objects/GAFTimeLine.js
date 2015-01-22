
gaf.ccRectUnion = function(src1, src2){
    var thisLeftX = src1.x;
    var thisRightX = src1.x + src1.width;
    var thisTopY = src1.y + src1.height;
    var thisBottomY = src1.y;

    if (thisRightX < thisLeftX)
    {
        // This rect has negative width
        var tmp = thisRightX;
        thisRightX = thisLeftX;
        thisLeftX = tmp;
    }

    if (thisTopY < thisBottomY)
    {
        // This rect has negative height
        var tmp = thisTopY;
        thisTopY = thisBottomY;
        thisBottomY = tmp;
    }

    var otherLeftX = src2.x;
    var otherRightX = src2.x + src2.width;
    var otherTopY = src2.y + src2.height;
    var otherBottomY = src2.y;

    if (otherRightX < otherLeftX)
    {
        // Other rect has negative width
        var tmp = otherLeftX;
        otherLeftX = otherRightX;
        otherRightX = tmp;
    }

    if (otherTopY < otherBottomY)
    {
        // Other rect has negative height
        var tmp = otherTopY;
        otherTopY = otherBottomY;
        otherBottomY = tmp;
    }

    var combinedLeftX = Math.min(thisLeftX, otherLeftX);
    var combinedRightX = Math.max(thisRightX, otherRightX);
    var combinedTopY = Math.max(thisTopY, otherTopY);
    var combinedBottomY = Math.min(thisBottomY, otherBottomY);

    return cc.rect(combinedLeftX, combinedBottomY, combinedRightX - combinedLeftX, combinedTopY - combinedBottomY);
};

gaf.TimeLine = gaf.Object.extend
({
    _className: "GAFTimeLine",
    _objects: null,
    _container: null,
    _animationStartedNextLoopDelegate: null,
    _animationFinishedPlayDelegate: null,
    _framePlayedDelegate: null,
    _sequenceDelegate: null,
    _fps: 60,
    _frameTime: 1/60,
    _currentSequenceStart: gaf.FIRST_FRAME_INDEX,
    _currentSequenceEnd: gaf.FIRST_FRAME_INDEX,
    _totalFrameCount: 0,
    _isRunning: false,
    _isLooped: false,
    _isReversed: false,
    _timeDelta: 0,
    _animationsSelectorScheduled: false,
    _currentFrame: gaf.FIRST_FRAME_INDEX,


    setAnimationStartedNextLoopDelegate: function (delegate)
    {
        this._animationStartedNextLoopDelegate = delegate;
    },
    setAnimationFinishedPlayDelegate: function (delegate)
    {
        this._animationFinishedPlayDelegate = delegate;
    },
    setLooped: function (looped, recursively)
    {
        this._isLooped = looped;
        if (recursively)
        {
            this._objects.forEach(function (item)
            {
                item.setLooped(looped, recursively);
            });
        }
    },
    getBoundingBoxForCurrentFrame: function ()
    {
        var result = cc.rect();
        var isFirstObj = true;
        this._objects.forEach(function (item) {
            if(item.isVisible())
            {
                var bb = item.getBoundingBoxForCurrentFrame();
                if(!bb)
                {
                    bb = item.getBoundingBox();
                }
                if (isFirstObj)
                {
                    result = bb;
                }
                else
                {
                    result = gaf.ccRectUnion(result, bb);
                }
                isFirstObj = false;
            }
        });
        return result;
    },
    setFps: function (fps)
    {
        cc.assert(fps !== 0, 'Error! Fps is set to zero.');
        this._fps = fps;
        this._frameTime = 1/fps;
    },
    getObjectByName: function (name)
    {
        var elements = name.split('.');
        var result = null;
        var retId = -1;
        var timeLine = this;
        var BreakException = {};
        try
        {
            elements.forEach(function(element)
            {
                var parts = timeLine._gafproto.getNamedParts();
                if(parts.hasOwnProperty(element))
                {
                    retId = parts[element];
                }
                else
                {
                    // Sequence is incorrect
                    BreakException.lastElement = element;
                    throw BreakException;
                }
                result = timeLine._objects[retId];
                timeLine = result;
            });
        }
        catch (e)
        {
            if (e!==BreakException)
            {
                throw e;
            }
            cc.log("Sequence incorrect: `" + name + "` At: `" + BreakException.lastElement + "`");
            return null;
        }
        return result;
    },
    clearSequence: function ()
    {
        this._currentSequenceStart = gaf.FIRST_FRAME_INDEX;
        this._currentSequenceEnd = this._gafproto.getTotalFrames();
    },
    getIsAnimationRunning: function ()
    {
        return this._isRunning;
    },
    gotoAndStop: function (value)
    {
        var frame = 0;
        if (typeof value === 'string')
        {
            frame = this.getStartFrame(value);
        }
        else
        {
            frame = value;
        }
        if (this.setFrame(frame))
        {
            this._setAnimationRunning(false, false);
            return true;
        }
        return false;
    },
    gotoAndPlay: function (value)
    {
        var frame = 0;
        if (typeof value === 'string')
        {
            frame = this.getStartFrame(value);
        }
        else
        {
            frame = value;
        }
        if (this.setFrame(frame))
        {
            this._setAnimationRunning(true, false);
            return true;
        }
        return false;
    },
    getStartFrame: function (frameLabel)
    {
        var seq = this._gafproto.getSequences()[frameLabel];
        if (seq)
        {
            return seq.start;
        }
        return gaf.IDNONE;
    },
    getEndFrame: function (frameLabel)
    {
        var seq = this._gafproto.getSequences()[frameLabel];
        if (seq)
        {
            return seq.end;
        }
        return gaf.IDNONE;
    },
    setFramePlayedDelegate: function (delegate)
    {
        this._framePlayedDelegate = delegate;
    },
    getCurrentFrameIndex: function ()
    {
        return this._showingFrame;
    },
    getTotalFrameCount: function ()
    {
        return this._gafproto.getTotalFrames();
    },
    start: function ()
    {
        this._enableTick(true);
        if (!this._isRunning)
        {
            this._currentFrame = gaf.FIRST_FRAME_INDEX;
            this._setAnimationRunning(true, true);
        }
    },
    stop: function ()
    {
        this._enableTick(false);
        if (this._isRunning)
        {
            this._currentFrame = gaf.FIRST_FRAME_INDEX;
            this._setAnimationRunning(false, true);
        }
    },
    isDone: function ()
    {
        if (this._isLooped)
        {
            return false;
        }
        else
        {
            if (!this._isReversed)
            {
                return this._currentFrame > this._totalFrameCount;
            }
            else
            {
                return this._currentFrame < gaf.FIRST_FRAME_INDEX - 1;
            }
        }
    },
    playSequence: function (name, looped)
    {
        var s = this.getStartFrame(name);
        var e = this.getEndFrame(name);
        if (gaf.IDNONE === s || gaf.IDNONE === e)
        {
            return false;
        }
        this._currentSequenceStart = s;
        this._currentSequenceEnd = e;
        if (this._currentFrame < this._currentSequenceStart || this._currentFrame > this._currentSequenceEnd)
        {
            this._currentFrame = this._currentSequenceStart;
        }
        else
        {
            this._currentFrame = this._currentSequenceStart;
        }
        this.setLooped(looped, false);
        this.resumeAnimation();
        return true;
    },
    isReversed: function ()
    {
        return this._isReversed;
    },
    setSequenceDelegate: function (delegate)
    {
        this._sequenceDelegate = delegate;
    },
    setFrame: function (index)
    {
        if (index >= gaf.FIRST_FRAME_INDEX && index < this._totalFrameCount)
        {
            this._showingFrame = index;
            this._currentFrame = index;
            this._processAnimation();
            return true;
        }
        return false;
    },
    setControlDelegate: function (func)
    {
        debugger;
    },
    pauseAnimation: function ()
    {
        if (this._isRunning)
        {
            this._setAnimationRunning(false, false);
        }
    },
    isLooped: function ()
    {
        return this._isLooped;
    },
    resumeAnimation: function ()
    {
        if (!this._isRunning)
        {
            this._setAnimationRunning(true, false);
        }
    },
    setReversed: function (reversed)
    {
        this._isReversed = reversed;
    },
    hasSequences: function ()
    {
        return this._gafproto.getSequences().length > 0;
    },
    getFps: function ()
    {
        return this._fps;
    },


    // Private

    ctor: function(gafTimeLineProto)
    {
        this._super();
        this._objects = [];
        cc.assert(gafTimeLineProto,  "Error! Missing mandatory parameter.");
        this._gafproto = gafTimeLineProto;
    },

    setExternalTransform: function(affineTransform)
    {
         if(!cc.affineTransformEqualToTransform(this._container._additionalTransform, affineTransform))
         {
            this._container.setAdditionalTransform(affineTransform);
         }
    },

    _init: function()
    {
        this._currentSequenceEnd = this._gafproto.getTotalFrames();
        this._totalFrameCount = this._currentSequenceEnd;
        this.setFps(this._gafproto.getFps());

        this._container = new cc.Node();
        this.addChild(this._container);

        var self = this;
        var asset = this._gafproto.getAsset();

        // Construct objects for current time line
        this._gafproto.getObjects().forEach(function(object)
        {
            var objectProto = asset._getProtos()[object];
            cc.assert(objectProto, "Error. GAF proto for type: " + object.type + " and reference id: " + object + " not found.");
            self._objects[object] = objectProto._gafConstruct();
        });

        /*
         var anchor =
         {
             x: (0 - (0 - (this._gafproto.getPivot().x / this._gafproto.getBoundingBox().width))),
             y: (0 + (1 - (this._gafproto.getPivot().y / this._gafproto.getBoundingBox().height)))
         };
         this._container.setContentSize(this._gafproto.getBoundingBox().width, this._gafproto.getBoundingBox().height);
         this._container.setAnchorPoint(anchor);
         this._container.setPosition(-this._gafproto.getBoundingBox().x, this._gafproto.getBoundingBox().height + this._gafproto.getBoundingBox().y);
         */
    },

    _enableTick: function(val)
    {
        if (!this._animationsSelectorScheduled && val)
        {
            this.schedule("_processAnimations");
            this._animationsSelectorScheduled = true;
        }
        else if (this._animationsSelectorScheduled && !val)
        {
            this.unschedule("_processAnimations");
            this._animationsSelectorScheduled = false;
        }
    },

    _processAnimations: function (dt)
    {
        this._timeDelta += dt;
        while (this._timeDelta >= this._frameTime)
        {
            this._timeDelta -= this._frameTime;
            this._step();
        }
    },

    _step: function ()
    {
        this._showingFrame = this._currentFrame;
        if (!this._isReversed)
        {
            if (this._currentFrame < this._currentSequenceStart)
            {
                this._currentFrame = this._currentSequenceStart;
            }
            if (this._sequenceDelegate)
            {
                debugger;
                var seq = this._getSequenceByLastFrame(this._currentFrame);
                if (seq)
                {
                    this._sequenceDelegate(this, seq);
                }
            }
            if (this._isLooped && (this._currentFrame > this._currentSequenceEnd - 1))
            {
                this._currentFrame = this._currentSequenceStart;
                if (this._animationStartedNextLoopDelegate)
                {
                    this._animationStartedNextLoopDelegate(this);
                }
            }
            else if(!this._isLooped && (this._currentFrame >= this._currentSequenceEnd - 1))
            {
                this._setAnimationRunning(false, false);
                if (this._animationFinishedPlayDelegate)
                {
                    this._animationFinishedPlayDelegate(this);
                }
            }
            this._processAnimation();
            if (this.getIsAnimationRunning())
            {
                this._showingFrame = this._currentFrame++;
            }
        }
        else
        {
            // If switched to reverse after final frame played
            if (this._currentFrame >= this._currentSequenceEnd || this._currentFrame < gaf.FIRST_FRAME_INDEX)
            {
                this._currentFrame = this._currentSequenceEnd - 1;
            }
            if (this._sequenceDelegate)
            {
                debugger;
                var seq = this._getSequenceByLastFrame(this._currentFrame + 1);
                if (seq)
                {
                    this._sequenceDelegate(this, seq);
                }
            }
            if (this._currentFrame < this._currentSequenceStart)
            {
                if (this._isLooped)
                {
                    this._currentFrame = this._currentSequenceEnd - 1;
                    if (this._animationStartedNextLoopDelegate)
                    {
                        this._animationStartedNextLoopDelegate(this);
                    }
                }
                else
                {
                    this._setAnimationRunning(false, false);
                    if (this._animationFinishedPlayDelegate)
                    {
                        this._animationFinishedPlayDelegate(this);
                    }
                    return;
                }
            }
            this._processAnimation();
            if (this.getIsAnimationRunning())
            {
                this._showingFrame = this._currentFrame--;
            }
        }
    },


    _processAnimation: function ()
    {
        var id = this._gafproto.getId();
        this._realizeFrame(this._container, this._currentFrame);
        if (this._framePlayedDelegate)
        {
            this._framePlayedDelegate(this, this._currentFrame);
        }
    },
    _realizeFrame: function(out, frameIndex)
    {
        var self = this;
        var objects = self._objects;
        var frames = self._gafproto.getFrames();
        if(frameIndex > frames.length)
        {
            return;
        }
        var currentFrame = frames[frameIndex];
        if(!currentFrame)
        {
            return;
        }
        var states = currentFrame.states;
        states.forEach(function(state)
        {
            var object = objects[state.objectIdRef];
            if(!object)
            {
                return;
            }
            object._updateVisibility(state, self);
            if(!object.isVisible())
            {
                return;
            }
            object._applyState(state, self);
            var parent = out;
            if(state.hasMask)
            {
                parent = objects[state.maskObjectIdRef]._getNode();
                cc.assert(parent, "Error! Mask not found.");
            }
            object._lastVisibleInFrame = 1 + frameIndex;
            gaf.TimeLine.rearrangeSubobject(parent, object, state.depth);
            if(object._step)
            {
                object._step();
            }
        });
    },
    _setAnimationRunning: function (value, recursively)
    {
        this._isRunning = value;
        if(recursively)
        {
            this._objects.forEach(function (obj)
            {
                if (obj && obj._setAnimationRunning)
                {
                    obj._setAnimationRunning(value, recursively);
                }
            });
        }
    },

    _getSequenceByLastFrame: function(){
        var sequences = this._gafproto.getSequences();
        for(var item in sequences){
            if(sequences.hasOwnProperty(item)){
                if(sequences[item].end === frame + 1)
                {
                    return item;
                }
            }
        }
        return "";
    }
});

gaf.TimeLine.rearrangeSubobject = function(out, object, depth)
{
    var parent = object.getParent();
    if (parent !== out)
    {
        object.removeFromParent(false);
        out.addChild(object, depth);
    }
    else
    {
        object.setLocalZOrder(depth);
    }
};
