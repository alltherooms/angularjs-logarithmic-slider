'use strict';

// HELPER FUNCTIONS
var log16 = Math.log(16);
var MAX_WIDTH = 100;
var percentOffset = function percentOffset(offset, offsetRange) {
  return offset / offsetRange * 100;
};
var percentValue = function percentValue(value, min, max) {
  if (value === max) {
    return 100;
  }
  return (value - min) / max * 100;
};
var expoPorcent = function expoPorcent(percent, min, max) {
  // http://van-uffelen.com/blog/?p=291
  if (percent === 0 || percent === 100) {
    return percent;
  }
  return (Math.exp(log16 * (percent / 100)) - 1) / 15 * MAX_WIDTH;
};
var unexpoPorcent = function unexpoPorcent(value, min, max) {
  return log16 * Math.log(value * 15 / MAX_WIDTH + 1);
};
var logPercentValue = function logPercentValue(percent, min, max) {
  if (percent === 0 && min === 0) {
    return 0;
  }
  // position will be between 0 and 100
  var minp = 0;
  var maxp = 100;

  // The result should be between 100 an 10000000
  var minv = min > 0 ? Math.log(min) : 0;
  var maxv = Math.log(max);

  // calculate adjustment factor
  var scale = (maxv - minv) / (maxp - minp);
  return Math.exp(minv + scale * (percent - minp));
};

var percentLogValue = function percentLogValue(value, min, max) {
  // position will be between 0 and 100
  var minp = 0;
  var maxp = 100;

  // The result should be between 100 an 10000000
  var minv = min > 0 ? Math.log(min) : 0;
  var maxv = max > 0 ? Math.log(max) : 0;
  var valuev = value > 0 ? Math.log(value) : 0;

  // calculate adjustment factor
  var scale = (maxv - minv) / (maxp - minp);
  var result = (valuev - minv) / scale + minp;
  if (result < 0) {
    return 0;
  }
  if (result > 100) {
    return 100;
  }
  return result;
};

var roundStep = function roundStep(value) {
  var precision = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
  var step = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];
  var floor = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

  precision = parseInt(precision);
  step = parseFloat(step);
  floor = parseFloat(floor);
  if (typeof step === 'undefined' || step === null) {
    step = 1 / Math.pow(10, precision);
  }
  var remainder = (value - floor) % step;
  var steppedValue = remainder > step / 2 ? value + step - remainder : value - remainder;
  var decimals = Math.pow(10, precision);
  var roundedValue = steppedValue * decimals / decimals;
  return parseFloat(roundedValue.toFixed(precision));
};
var inputEvents = {
  mouse: {
    start: 'mousedown',
    move: 'mousemove',
    end: 'mouseup'
  },
  touch: {
    start: 'touchstart',
    move: 'touchmove',
    end: 'touchend'
  }
};

// DIRECTIVE DEFINITION
angular.module('ngLogSlider', []).directive('logSlider', function ($timeout) {
  return {
    restrict: 'EA',
    scope: {
      floor: '@',
      ceiling: '@',
      hideBubble: '@',
      maxDefault: '@',
      exponential: '@',
      translate: '&',
      ngModel: '=?',
      ngModelLow: '=?',
      ngModelHigh: '=?',
      onSlideEnd: '=?',
      step: '@',
      precision: '@'
    },

    template: '\n    <div class=\'log-slider\'>\n      <div class="bar-holder">\n        <div class="full-bar">\n          <div class="sel-bar"></div>\n        </div>\n        <div class="point-holder">\n          <div class="min-ptr"></div>\n          <div class="max-ptr"></div>\n        </div>\n      </div>\n    </div>',
    compile: function compile(element, attributes) {

      // Set default initial state in the max and minimus values avalible
      if (attributes.maxDefault != null) {
        var maxDefault = true;
      }

      // Expand the translation function abbreviation
      if (attributes.translate) {
        attributes.$set('translate', attributes.translate + '(value)');
      }

      // Check if it is a range slider
      var range = !(attributes.ngModel != null) && attributes.ngModelLow != null && attributes.ngModelHigh != null;
      var exponential = attributes.exponential != null;

      // Shorthand references to the 2 model scopes
      var refLow = range ? 'ngModelLow' : 'ngModel';
      var refHigh = 'ngModelHigh';

      // user has change the values
      var hasBeenChanged = false;

      return {
        post: function post(scope, element, attributes) {
          var elem = element[0];
          // Get references to template elements
          var fullBar = angular.element(elem.querySelector('.full-bar'));
          var selBar = angular.element(elem.querySelector('.sel-bar'));
          var minPtr = angular.element(elem.querySelector('.min-ptr'));
          var maxPtr = angular.element(elem.querySelector('.max-ptr'));

          // Remove range specific elements if not a range slider
          if (range) {
            var watchables = [refLow, refHigh];
          } else {
            maxPtr.remove();
            var watchables = [refLow];
          }

          var ngDocument = angular.element(document);
          var ptrWidth = minPtr[0].offsetWidth;
          var minValue = parseFloat(attributes.floor);
          var maxValue = parseFloat(attributes.ceiling);
          var valueRange = maxValue - minValue;

          if (range) {
            if (scope[refLow] === 0) {
              scope[refLow] = minValue;
            }
            if (scope[refHigh] === 0) {
              scope[refHigh] = maxValue;
            }
          } else {
            if (scope[refLow] < minValue) {
              scope[refLow] = minValue;
            }
            if (scope[refLow] > maxValue) {
              scope[refLow] = maxValue;
            }
          }

          // Porcent Manager
          scope.porcent = {};

          var updateDOM = function updateDOM() {
            if (exponential) {
              scope.porcent[refLow] = percentLogValue(scope[refLow], minValue, maxValue);
              if (range) {
                scope.porcent[refHigh] = percentLogValue(scope[refHigh], minValue, maxValue);
              }
            } else {
              scope.porcent[refLow] = percentValue(scope[refLow], minValue, maxValue);
              if (range) {
                scope.porcent[refHigh] = percentValue(scope[refHigh], minValue, maxValue);
              }
            }

            minPtr.css({ left: scope.porcent[refLow] + "%" });
            if (range) {
              maxPtr.css({ left: scope.porcent[refHigh] + "%" });
              return selBar.css({ left: scope.porcent[refLow] + "%", width: scope.porcent[refHigh] - scope.porcent[refLow] + "%" });
            } else {
              return selBar.css({ width: scope.porcent[refLow] + "%" });
            }
          };

          var onEndFunction = function onEndFunction() {
            hasBeenChanged = true;
            if (typeof scope.onSlideEnd === "function") {
              return scope.onSlideEnd();
            }
          };

          var onMoveFunction = function onMoveFunction(event, ref, ponter) {
            if (event.clientX) {
              var eventX = event.clientX;
            }
            if (event.originalEvent && event.originalEvent.touches) {
              var eventX = event.originalEvent.touches[0].clientX;
            }
            var dimencions = fullBar[0].getBoundingClientRect();
            var newOffset = Math.max(Math.min(eventX, dimencions.right), dimencions.left) - dimencions.left;
            var newPercent = percentOffset(newOffset, dimencions.width);

            if (exponential) {
              var newValue = logPercentValue(newPercent, minValue, maxValue);
              // newValue = minValue + (valueRange * expoPorcent(newPercent) / 100.0)
            } else {
                var newValue = minValue + valueRange * newPercent / 100.0;
              }
            var newValue = roundStep(newValue, scope.precision, scope.step, scope.floor);

            if (range) {
              if (ref === refLow) {
                if (newValue > scope[refHigh]) {
                  ref = refHigh;
                }
              } else {
                if (newValue < scope[refLow]) {
                  ref = refLow;
                }
              }
            } else {
              ref = refLow;
            }

            scope[ref] = newValue;
            scope.$apply();
            return updateDOM();
          };

          var boundToInputs = false;
          var bindToInputEvents = function bindToInputEvents(pointer, ref, events, bar) {
            var onEnd = function onEnd() {
              pointer.removeClass('active');
              ngDocument.unbind(events.move);
              ngDocument.unbind(events.end);
              return onEndFunction();
            };
            var onMove = function onMove(event) {
              return onMoveFunction(event, ref, pointer);
            };
            var onStart = function onStart(event) {
              event.stopPropagation();
              event.preventDefault();
              pointer.addClass('active');
              ngDocument.bind(events.move, onMove);
              return ngDocument.bind(events.end, onEnd);
            };
            pointer.bind(events.start, onStart);
            if (bar != null) {
              return bar.bind(events.start, function (event) {
                onMoveFunction(event, ref, pointer);
                return onEndFunction();
              });
            }
          };

          var setBindings = function setBindings() {
            boundToInputs = true;
            var bind = function bind(method) {
              bindToInputEvents(minPtr, refLow, inputEvents[method]);
              return bindToInputEvents(maxPtr, refHigh, inputEvents[method], fullBar);
            };
            var iterable = ['touch', 'mouse'];
            for (var i = 0; i < iterable.length; i++) {
              var inputMethod = iterable[i];bind(inputMethod);
            }
            return;
          };

          if (!boundToInputs) {
            setBindings();
          }

          scope.$watch("ngModelLow + ngModelHigh", function (value, oldValue) {
            if (value === 0) {
              return hasBeenChanged = false;
            }
          });

          // Observers
          scope.$watch("floor", function (value, oldValue) {
            if (value !== oldValue) {
              value = parseFloat(value);
              if (scope[refLow] === minValue) {
                scope[refLow] = value;
              }

              minValue = value;
              valueRange = maxValue - minValue;
              // if scope[refLow] < minValue or scope[refLow] > maxValue
              //   scope[refLow] = minValue

              if (!hasBeenChanged) {
                // if range and scope[refLow] < minValue
                //   scope[refLow] = minValue
                return updateDOM();
              }
            }
          });

          scope.$watch('ceiling', function (value, oldValue) {
            value = parseFloat(value);
            if (scope[refHigh] === maxValue) {
              scope[refHigh] = value;
            }

            maxValue = value;
            valueRange = maxValue - minValue;
            // if range
            //   if scope[refHigh] > maxValue or scope[refHigh] < minValue
            //     scope[refHigh] = maxValue
            if (!hasBeenChanged && maxDefault) {
              // if range
              //   if scope[refHigh] > maxValue
              //     scope[refHigh] = maxValue
              // else
              //   if scope[refLow] > maxValue
              //     scope[refLow] = maxValue
              return updateDOM();
            }
          });

          for (var i = 0; i < watchables.length; i++) {
            var w = watchables[i];
            scope.$watch(w, updateDOM);
          }
        }
      };
    }
  };
});