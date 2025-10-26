var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import axios from 'axios';
import * as fs from 'fs/promises';
var FREESOUND_API_BASE = 'https://freesound.org/apiv2';
var FreesoundService = /** @class */ (function () {
    function FreesoundService(apiKey) {
        this.apiKey = apiKey;
        console.log('FreeSound service initialized with API key');
        this.axiosInstance = axios.create({
            baseURL: FREESOUND_API_BASE,
            timeout: 30000,
        });
    }
    // Search for sounds using API key
    FreesoundService.prototype.search = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('Searching FreeSound:', params.query);
                        return [4 /*yield*/, this.axiosInstance.get('/search/text/', {
                                params: __assign(__assign({}, params), { token: this.apiKey })
                            })];
                    case 1:
                        response = _a.sent();
                        console.log("Found ".concat(response.data.count, " results"));
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // Get sound details by ID
    FreesoundService.prototype.getSound = function (soundId) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.axiosInstance.get("/sounds/".concat(soundId, "/"), {
                            params: {
                                token: this.apiKey
                            }
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    // Download preview (high-quality MP3/OGG - no auth needed)
    FreesoundService.prototype.downloadPreview = function (previewUrl, outputPath) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('Downloading preview from:', previewUrl);
                        return [4 /*yield*/, axios.get(previewUrl, {
                                responseType: 'arraybuffer'
                            })];
                    case 1:
                        response = _a.sent();
                        return [4 /*yield*/, fs.writeFile(outputPath, Buffer.from(response.data))];
                    case 2:
                        _a.sent();
                        console.log('Preview downloaded to:', outputPath);
                        return [2 /*return*/, outputPath];
                }
            });
        });
    };
    return FreesoundService;
}());
export { FreesoundService };
// Singleton instance
var freesoundService = null;
export function initializeFreesoundService(apiKey) {
    freesoundService = new FreesoundService(apiKey);
    return freesoundService;
}
export function getFreesoundService() {
    if (!freesoundService) {
        throw new Error('FreesoundService not initialized. Make sure FREESOUND_CLIENT_ID is set in .env');
    }
    return freesoundService;
}
