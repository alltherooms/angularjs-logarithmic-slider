// HELPER FUNCTIONS
let log16 = Math.log(16);
let MAX_WIDTH = 100;
let percentOffset = (offset, offsetRange) => (offset / offsetRange) * 100;
let percentValue = function(value, min, max){
  if (value === max) { return 100; }
  return ((value - min) / max) * 100;
};
let expoPorcent = function(percent, min, max){
  // http://van-uffelen.com/blog/?p=291
  if (percent === 0 || percent === 100) { return percent; }
  return ((Math.exp(log16 * (percent / 100)) - 1) / 15)*MAX_WIDTH;
};
let unexpoPorcent = (value, min, max)=> log16 * (Math.log(value * 15 / MAX_WIDTH + 1));
let logPercentValue = function(percent, min, max){
  if (percent === 0 && min === 0) { return 0; }
  // position will be between 0 and 100
  let minp = 0;
  let maxp = 100;

  // The result should be between 100 an 10000000
  let minv = min > 0 ? Math.log(min) : 0;
  let maxv = Math.log(max);

  // calculate adjustment factor
  let scale = (maxv-minv) / (maxp-minp);
  return Math.exp(minv + scale*(percent-minp));
};

let percentLogValue = function(value, min, max){
  // position will be between 0 and 100
  let minp = 0;
  let maxp = 100;

  // The result should be between 100 an 10000000
  let minv = min > 0 ? Math.log(min) : 0;
  let maxv = max > 0 ? Math.log(max) : 0;
  let valuev = value > 0 ? Math.log(value) : 0;

  // calculate adjustment factor
  let scale = (maxv-minv) / (maxp-minp);
  let result = (valuev-minv) / scale + minp;
  if (result < 0) { return 0; }
  if (result > 100) { return 100; }
  return result;
};

let roundStep = function(value, precision = 0, step = 1, floor = 0) {
  precision = parseInt(precision);
  step = parseFloat(step);
  floor = parseFloat(floor);
  if (typeof step === 'undefined' || step === null) { step = 1 / Math.pow(10, precision); }
  let remainder = (value - floor) % step;
  let steppedValue =
    remainder > (step / 2)
    ? value + step - remainder
    : value - remainder;
  let decimals = Math.pow(10, precision);
  let roundedValue = steppedValue * decimals / decimals;
  return parseFloat(roundedValue.toFixed(precision));
};
let inputEvents = {
  mouse: {
    start: 'mousedown',
    move:  'mousemove',
    end:   'mouseup'
  },
  touch: {
    start: 'touchstart',
    move:  'touchmove',
    end:   'touchend'
  }
};

// DIRECTIVE DEFINITION
angular.module('ngLogSlider', [])
.directive('logSlider', $timeout =>
  ({
    restrict: 'EA',
    scope: {
      floor:       '@',
      ceiling:     '@',
      hideBubble:  '@',
      maxDefault:  '@',
      exponential: '@',
      translate:   '&',
      ngModel:     '=?',
      ngModelLow:  '=?',
      ngModelHigh: '=?',
      onSlideEnd:  '=?',
      step:        '@',
      precision:   '@'
    },

    template: `
    <div class='log-slider'>
      <div class="bar-holder">
        <div class="full-bar">
          <div class="sel-bar"></div>
        </div>
        <div class="point-holder">
          <div class="min-ptr"></div>
          <div class="max-ptr"></div>
        </div>
      </div>
    </div>`,
    compile(element, attributes) {

      // Set default initial state in the max and minimus values avalible
      if (attributes.maxDefault != null) {
        var maxDefault = true;
      }

      // Expand the translation function abbreviation
      if (attributes.translate) { attributes.$set('translate', `${attributes.translate}(value)`); }

      // Check if it is a range slider
      let range = !(attributes.ngModel != null) && ((attributes.ngModelLow != null) && (attributes.ngModelHigh != null));
      let exponential = (attributes.exponential != null);

      // Shorthand references to the 2 model scopes
      let refLow = range ? 'ngModelLow' : 'ngModel';
      let refHigh = 'ngModelHigh';

      // user has change the values
      let hasBeenChanged = false;

      return {
        post(scope, element, attributes) {
          let elem = element[0];
          // Get references to template elements
          let fullBar = angular.element(elem.querySelector('.full-bar'));
          let selBar = angular.element(elem.querySelector('.sel-bar'));
          let minPtr = angular.element(elem.querySelector('.min-ptr'));
          let maxPtr = angular.element(elem.querySelector('.max-ptr'));

          // Remove range specific elements if not a range slider
          if (range) {
            var watchables = [refLow, refHigh];
          } else {
            maxPtr.remove();
            var watchables = [refLow];
          }

          let ngDocument = angular.element(document);
          let ptrWidth = minPtr[0].offsetWidth;
          let minValue = parseFloat(attributes.floor);
          let maxValue = parseFloat(attributes.ceiling);
          let valueRange = maxValue - minValue;

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

          let updateDOM = function() {
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

            minPtr.css({left: scope.porcent[refLow] + "%"});
            if (range) {
              maxPtr.css({left: scope.porcent[refHigh] + "%"});
              return selBar.css({left: scope.porcent[refLow] + "%", width: (scope.porcent[refHigh] - scope.porcent[refLow]) +  "%"});
            } else {
              return selBar.css({width: scope.porcent[refLow] +  "%"});
            }
          };

          let onEndFunction = function() {
            hasBeenChanged = true;
            if (typeof(scope.onSlideEnd) === "function") { return scope.onSlideEnd(); }
          };

          let onMoveFunction = function(event, ref, ponter) {
            if (event.clientX) {
              var eventX = event.clientX;
            }
            if (event.originalEvent && event.originalEvent.touches) {
              var eventX = event.originalEvent.touches[0].clientX;
            }
            let dimencions = fullBar[0].getBoundingClientRect();
            let newOffset = Math.max(Math.min(eventX, dimencions.right), dimencions.left) - dimencions.left;
            let newPercent = percentOffset(newOffset, dimencions.width);

            if (exponential) {
              var newValue = logPercentValue(newPercent, minValue, maxValue);
              // newValue = minValue + (valueRange * expoPorcent(newPercent) / 100.0)
            } else {
              var newValue = minValue + (valueRange * newPercent / 100.0);
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

          let boundToInputs = false;
          let bindToInputEvents = function(pointer, ref, events, bar) {
            let onEnd = function() {
              pointer.removeClass('active');
              ngDocument.unbind(events.move);
              ngDocument.unbind(events.end);
              return onEndFunction();
            };
            let onMove = event => onMoveFunction(event, ref, pointer);
            let onStart = function(event) {
              event.stopPropagation();
              event.preventDefault();
              pointer.addClass('active');
              ngDocument.bind(events.move, onMove);
              return ngDocument.bind(events.end, onEnd);
            };
            pointer.bind(events.start, onStart);
            if (bar != null) {
              return bar.bind(events.start, function(event){
                onMoveFunction(event, ref, pointer);
                return onEndFunction();
              });
            }
          };

          let setBindings = function() {
            boundToInputs = true;
            let bind = function(method) {
              bindToInputEvents(minPtr, refLow, inputEvents[method]);
              return bindToInputEvents(maxPtr, refHigh, inputEvents[method], fullBar);
            };
            let iterable = ['touch', 'mouse'];
            for (let i = 0; i < iterable.length; i++) { let inputMethod = iterable[i];             bind(inputMethod); }
            return;
          };

          if (!boundToInputs) { setBindings(); }

          scope.$watch("ngModelLow + ngModelHigh", function(value, oldValue){
            if (value === 0) { return hasBeenChanged = false; }
          });

          // Observers
          scope.$watch("floor", function(value, oldValue){
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

          scope.$watch('ceiling', function(value, oldValue){
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

          for (let i = 0; i < watchables.length; i++) { let w = watchables[i];
            scope.$watch(w, updateDOM);
          }
        }
      };
    }
  })
);
