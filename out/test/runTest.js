/******/ var __webpack_modules__ = ({

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "vscode-test":
/*!******************************!*\
  !*** external "vscode-test" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("vscode-test");

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
/*!*****************************!*\
  !*** ./src/test/runTest.ts ***!
  \*****************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const path = __webpack_require__(/*! path */ "path");
const vscode_test_1 = __webpack_require__(/*! vscode-test */ "vscode-test");
async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        console.log(`extensionDevelopmentPath = ${extensionDevelopmentPath}`);
        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        console.log(`extensionTestsPath = ${extensionTestsPath}`);
        // Download VS Code, unzip it and run the integration test
        await (0, vscode_test_1.runTests)({ extensionDevelopmentPath, extensionTestsPath });
    }
    catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}
main();

})();

var __webpack_export_target__ = exports;
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuVGVzdC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7Ozs7Ozs7O0FDQUE7Ozs7OztTQ0FBO1NBQ0E7O1NBRUE7U0FDQTtTQUNBO1NBQ0E7U0FDQTtTQUNBO1NBQ0E7U0FDQTtTQUNBO1NBQ0E7U0FDQTtTQUNBO1NBQ0E7O1NBRUE7U0FDQTs7U0FFQTtTQUNBO1NBQ0E7Ozs7Ozs7Ozs7OztBQ3RCQSxxREFBNkI7QUFFN0IsNEVBQXVDO0FBRXZDLEtBQUssVUFBVSxJQUFJO0lBQ2pCLElBQUk7UUFDRiw0REFBNEQ7UUFDNUQseUNBQXlDO1FBQ3pDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbkUsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBRXRFLDBCQUEwQjtRQUMxQixpQ0FBaUM7UUFDakMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFFMUQsMERBQTBEO1FBQzFELE1BQU0sMEJBQVEsRUFBQyxFQUFFLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQztLQUNsRTtJQUFDLE9BQU8sR0FBRyxFQUFFO1FBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDakI7QUFDSCxDQUFDO0FBRUQsSUFBSSxFQUFFLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93b2xmcmFtLWxhbmd1YWdlLW5vdGVib29rL2V4dGVybmFsIGNvbW1vbmpzIFwicGF0aFwiIiwid2VicGFjazovL3dvbGZyYW0tbGFuZ3VhZ2Utbm90ZWJvb2svZXh0ZXJuYWwgY29tbW9uanMgXCJ2c2NvZGUtdGVzdFwiIiwid2VicGFjazovL3dvbGZyYW0tbGFuZ3VhZ2Utbm90ZWJvb2svd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vd29sZnJhbS1sYW5ndWFnZS1ub3RlYm9vay8uL3NyYy90ZXN0L3J1blRlc3QudHMiXSwic291cmNlc0NvbnRlbnQiOlsibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGF0aFwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ2c2NvZGUtdGVzdFwiKTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuaW1wb3J0IHsgcnVuVGVzdHMgfSBmcm9tICd2c2NvZGUtdGVzdCc7XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gIHRyeSB7XG4gICAgLy8gVGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBFeHRlbnNpb24gTWFuaWZlc3QgcGFja2FnZS5qc29uXG4gICAgLy8gUGFzc2VkIHRvIGAtLWV4dGVuc2lvbkRldmVsb3BtZW50UGF0aGBcbiAgICBjb25zdCBleHRlbnNpb25EZXZlbG9wbWVudFBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vJyk7XG4gICAgY29uc29sZS5sb2coYGV4dGVuc2lvbkRldmVsb3BtZW50UGF0aCA9ICR7ZXh0ZW5zaW9uRGV2ZWxvcG1lbnRQYXRofWApO1xuXG4gICAgLy8gVGhlIHBhdGggdG8gdGVzdCBydW5uZXJcbiAgICAvLyBQYXNzZWQgdG8gLS1leHRlbnNpb25UZXN0c1BhdGhcbiAgICBjb25zdCBleHRlbnNpb25UZXN0c1BhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zdWl0ZS9pbmRleCcpO1xuICAgIGNvbnNvbGUubG9nKGBleHRlbnNpb25UZXN0c1BhdGggPSAke2V4dGVuc2lvblRlc3RzUGF0aH1gKTtcblxuICAgIC8vIERvd25sb2FkIFZTIENvZGUsIHVuemlwIGl0IGFuZCBydW4gdGhlIGludGVncmF0aW9uIHRlc3RcbiAgICBhd2FpdCBydW5UZXN0cyh7IGV4dGVuc2lvbkRldmVsb3BtZW50UGF0aCwgZXh0ZW5zaW9uVGVzdHNQYXRoIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcnVuIHRlc3RzJyk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG59XG5cbm1haW4oKTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==