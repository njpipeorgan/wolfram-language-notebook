import { createRequire as __WEBPACK_EXTERNAL_createRequire } from "module";
/******/ var __webpack_modules__ = ({

/***/ "vscode":
/*!*************************!*\
  !*** external "vscode" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("assert");

/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!******************************************!*\
  !*** ./src/test/suite/extension.test.ts ***!
  \******************************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const assert = __webpack_require__(/*! assert */ "assert");
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = __webpack_require__(/*! vscode */ "vscode");
// import * as myExtension from '../extension';
suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');
    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
});

})();

var __webpack_export_target__ = exports;
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLnRlc3QuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7Ozs7Ozs7Ozs7QUNBQTs7Ozs7O1NDQUE7U0FDQTs7U0FFQTtTQUNBO1NBQ0E7U0FDQTtTQUNBO1NBQ0E7U0FDQTtTQUNBO1NBQ0E7U0FDQTtTQUNBO1NBQ0E7U0FDQTs7U0FFQTtTQUNBOztTQUVBO1NBQ0E7U0FDQTs7Ozs7Ozs7Ozs7O0FDdEJBLDJEQUFpQztBQUVqQywwREFBMEQ7QUFDMUQsOENBQThDO0FBQzlDLDJEQUFpQztBQUNqQywrQ0FBK0M7QUFFL0MsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFFekQsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL3dvbGZyYW0tbGFuZ3VhZ2Utbm90ZWJvb2svZXh0ZXJuYWwgY29tbW9uanMgXCJ2c2NvZGVcIiIsIndlYnBhY2s6Ly93b2xmcmFtLWxhbmd1YWdlLW5vdGVib29rL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJhc3NlcnRcIiIsIndlYnBhY2s6Ly93b2xmcmFtLWxhbmd1YWdlLW5vdGVib29rL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3dvbGZyYW0tbGFuZ3VhZ2Utbm90ZWJvb2svLi9zcmMvdGVzdC9zdWl0ZS9leHRlbnNpb24udGVzdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ2c2NvZGVcIik7IiwibW9kdWxlLmV4cG9ydHMgPSBfX1dFQlBBQ0tfRVhURVJOQUxfY3JlYXRlUmVxdWlyZShpbXBvcnQubWV0YS51cmwpKFwiYXNzZXJ0XCIpOyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCJpbXBvcnQgKiBhcyBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcblxuLy8gWW91IGNhbiBpbXBvcnQgYW5kIHVzZSBhbGwgQVBJIGZyb20gdGhlICd2c2NvZGUnIG1vZHVsZVxuLy8gYXMgd2VsbCBhcyBpbXBvcnQgeW91ciBleHRlbnNpb24gdG8gdGVzdCBpdFxuaW1wb3J0ICogYXMgdnNjb2RlIGZyb20gJ3ZzY29kZSc7XG4vLyBpbXBvcnQgKiBhcyBteUV4dGVuc2lvbiBmcm9tICcuLi9leHRlbnNpb24nO1xuXG5zdWl0ZSgnRXh0ZW5zaW9uIFRlc3QgU3VpdGUnLCAoKSA9PiB7XG4gIHZzY29kZS53aW5kb3cuc2hvd0luZm9ybWF0aW9uTWVzc2FnZSgnU3RhcnQgYWxsIHRlc3RzLicpO1xuXG4gIHRlc3QoJ1NhbXBsZSB0ZXN0JywgKCkgPT4ge1xuICAgIGFzc2VydC5zdHJpY3RFcXVhbCgtMSwgWzEsIDIsIDNdLmluZGV4T2YoNSkpO1xuICAgIGFzc2VydC5zdHJpY3RFcXVhbCgtMSwgWzEsIDIsIDNdLmluZGV4T2YoMCkpO1xuICB9KTtcbn0pO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9