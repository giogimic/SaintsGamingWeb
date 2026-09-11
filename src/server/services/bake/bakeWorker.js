"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var worker_threads_1 = require("worker_threads");
var VoxelWorldGenerator_1 = require("@/shared/game/voxel/VoxelWorldGenerator");
var zlib_1 = __importDefault(require("zlib"));
function handleTask(task) {
    return __awaiter(this, void 0, void 0, function () {
        var config, regionX, regionZ, chunksPerRegion, startCx, startCz, regionData, chunksGenerated, lz, lx, cx, cz, seedBase, chunkHash, chunkConfig, chunk, chunkKey, regionString, compressedBuffer, checksum, result;
        return __generator(this, function (_a) {
            config = task.config, regionX = task.regionX, regionZ = task.regionZ, chunksPerRegion = task.chunksPerRegion;
            startCx = regionX * chunksPerRegion;
            startCz = regionZ * chunksPerRegion;
            regionData = {};
            chunksGenerated = 0;
            for (lz = 0; lz < chunksPerRegion; lz++) {
                for (lx = 0; lx < chunksPerRegion; lx++) {
                    cx = startCx + lx;
                    cz = startCz + lz;
                    seedBase = String(config.seed || 1337);
                    chunkHash = "".concat(seedBase, "_v1_").concat(cx, "_").concat(cz, "_0_all");
                    chunkConfig = __assign(__assign({}, config), { seed: chunkHash });
                    chunk = (0, VoxelWorldGenerator_1.generateChunkVoxels)(cx, cz, 0, chunkConfig);
                    // 2. Validate Chunk (Lightweight)
                    if (chunk.dataLow.length !== 32768 || chunk.dataHigh.length !== 32768) {
                        throw new Error("Validation failed for chunk ".concat(cx, ",").concat(cz, ": Invalid array lengths."));
                    }
                    chunkKey = "".concat(cx, "_").concat(cz, "_0");
                    // We store it simply in the record for region assembly. 
                    // In a real binary layout we might serialize these consecutively into a buffer.
                    // For now, we will JSON stringify the region chunks and then Deflate compress it.
                    regionData[chunkKey] = __spreadArray(__spreadArray([], chunk.dataLow, true), chunk.dataHigh, true);
                    chunksGenerated++;
                    // Simulate memory release by discarding chunk reference immediately
                    // The regionData holds the raw ints, but we don't hold the VoxelChunk class instance.
                }
            }
            regionString = JSON.stringify({ chunks: regionData });
            compressedBuffer = zlib_1.default.deflateSync(Buffer.from(regionString, 'utf-8'));
            checksum = require('crypto').createHash('sha256').update(compressedBuffer).digest('hex');
            result = {
                taskId: task.taskId,
                regionX: regionX,
                regionZ: regionZ,
                status: 'COMPLETED',
                chunksGenerated: chunksGenerated,
                compressedPayload: new Uint8Array(compressedBuffer),
                checksum: checksum
            };
            worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage(result);
            return [2 /*return*/];
        });
    });
}
worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.on('message', function (task) { return __awaiter(void 0, void 0, void 0, function () {
    var err_1, errResult;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, handleTask(task)];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                err_1 = _a.sent();
                errResult = {
                    taskId: task.taskId,
                    regionX: task.regionX,
                    regionZ: task.regionZ,
                    status: 'ERROR',
                    chunksGenerated: 0,
                    error: err_1.message || 'Unknown Worker Error'
                };
                worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage(errResult);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
