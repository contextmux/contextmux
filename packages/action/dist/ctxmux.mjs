#!/usr/bin/env node
import { createRequire as __ctxmuxRequire } from "node:module"
const require = __ctxmuxRequire(import.meta.url)
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util, objectUtil, ZodParsedType, getParsedType;
var init_util = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js"() {
    (function(util2) {
      util2.assertEqual = (_) => {
      };
      function assertIs(_arg) {
      }
      util2.assertIs = assertIs;
      function assertNever(_x) {
        throw new Error();
      }
      util2.assertNever = assertNever;
      util2.arrayToEnum = (items) => {
        const obj = {};
        for (const item of items) {
          obj[item] = item;
        }
        return obj;
      };
      util2.getValidEnumValues = (obj) => {
        const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
        const filtered = {};
        for (const k of validKeys) {
          filtered[k] = obj[k];
        }
        return util2.objectValues(filtered);
      };
      util2.objectValues = (obj) => {
        return util2.objectKeys(obj).map(function(e) {
          return obj[e];
        });
      };
      util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
        const keys = [];
        for (const key in object) {
          if (Object.prototype.hasOwnProperty.call(object, key)) {
            keys.push(key);
          }
        }
        return keys;
      };
      util2.find = (arr, checker) => {
        for (const item of arr) {
          if (checker(item))
            return item;
        }
        return void 0;
      };
      util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
      function joinValues(array, separator = " | ") {
        return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
      }
      util2.joinValues = joinValues;
      util2.jsonStringifyReplacer = (_, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      };
    })(util || (util = {}));
    (function(objectUtil2) {
      objectUtil2.mergeShapes = (first, second) => {
        return {
          ...first,
          ...second
          // second overwrites first
        };
      };
    })(objectUtil || (objectUtil = {}));
    ZodParsedType = util.arrayToEnum([
      "string",
      "nan",
      "number",
      "integer",
      "float",
      "boolean",
      "date",
      "bigint",
      "symbol",
      "function",
      "undefined",
      "null",
      "array",
      "object",
      "unknown",
      "promise",
      "void",
      "never",
      "map",
      "set"
    ]);
    getParsedType = (data) => {
      const t = typeof data;
      switch (t) {
        case "undefined":
          return ZodParsedType.undefined;
        case "string":
          return ZodParsedType.string;
        case "number":
          return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
        case "boolean":
          return ZodParsedType.boolean;
        case "function":
          return ZodParsedType.function;
        case "bigint":
          return ZodParsedType.bigint;
        case "symbol":
          return ZodParsedType.symbol;
        case "object":
          if (Array.isArray(data)) {
            return ZodParsedType.array;
          }
          if (data === null) {
            return ZodParsedType.null;
          }
          if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
            return ZodParsedType.promise;
          }
          if (typeof Map !== "undefined" && data instanceof Map) {
            return ZodParsedType.map;
          }
          if (typeof Set !== "undefined" && data instanceof Set) {
            return ZodParsedType.set;
          }
          if (typeof Date !== "undefined" && data instanceof Date) {
            return ZodParsedType.date;
          }
          return ZodParsedType.object;
        default:
          return ZodParsedType.unknown;
      }
    };
  }
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode, quotelessJson, ZodError;
var init_ZodError = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js"() {
    init_util();
    ZodIssueCode = util.arrayToEnum([
      "invalid_type",
      "invalid_literal",
      "custom",
      "invalid_union",
      "invalid_union_discriminator",
      "invalid_enum_value",
      "unrecognized_keys",
      "invalid_arguments",
      "invalid_return_type",
      "invalid_date",
      "invalid_string",
      "too_small",
      "too_big",
      "invalid_intersection_types",
      "not_multiple_of",
      "not_finite"
    ]);
    quotelessJson = (obj) => {
      const json = JSON.stringify(obj, null, 2);
      return json.replace(/"([^"]+)":/g, "$1:");
    };
    ZodError = class _ZodError extends Error {
      get errors() {
        return this.issues;
      }
      constructor(issues) {
        super();
        this.issues = [];
        this.addIssue = (sub) => {
          this.issues = [...this.issues, sub];
        };
        this.addIssues = (subs = []) => {
          this.issues = [...this.issues, ...subs];
        };
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(this, actualProto);
        } else {
          this.__proto__ = actualProto;
        }
        this.name = "ZodError";
        this.issues = issues;
      }
      format(_mapper) {
        const mapper = _mapper || function(issue) {
          return issue.message;
        };
        const fieldErrors = { _errors: [] };
        const processError = (error2) => {
          for (const issue of error2.issues) {
            if (issue.code === "invalid_union") {
              issue.unionErrors.map(processError);
            } else if (issue.code === "invalid_return_type") {
              processError(issue.returnTypeError);
            } else if (issue.code === "invalid_arguments") {
              processError(issue.argumentsError);
            } else if (issue.path.length === 0) {
              fieldErrors._errors.push(mapper(issue));
            } else {
              let curr = fieldErrors;
              let i = 0;
              while (i < issue.path.length) {
                const el = issue.path[i];
                const terminal = i === issue.path.length - 1;
                if (!terminal) {
                  curr[el] = curr[el] || { _errors: [] };
                } else {
                  curr[el] = curr[el] || { _errors: [] };
                  curr[el]._errors.push(mapper(issue));
                }
                curr = curr[el];
                i++;
              }
            }
          }
        };
        processError(this);
        return fieldErrors;
      }
      static assert(value) {
        if (!(value instanceof _ZodError)) {
          throw new Error(`Not a ZodError: ${value}`);
        }
      }
      toString() {
        return this.message;
      }
      get message() {
        return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
      }
      get isEmpty() {
        return this.issues.length === 0;
      }
      flatten(mapper = (issue) => issue.message) {
        const fieldErrors = {};
        const formErrors = [];
        for (const sub of this.issues) {
          if (sub.path.length > 0) {
            const firstEl = sub.path[0];
            fieldErrors[firstEl] = fieldErrors[firstEl] || [];
            fieldErrors[firstEl].push(mapper(sub));
          } else {
            formErrors.push(mapper(sub));
          }
        }
        return { formErrors, fieldErrors };
      }
      get formErrors() {
        return this.flatten();
      }
    };
    ZodError.create = (issues) => {
      const error2 = new ZodError(issues);
      return error2;
    };
  }
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap, en_default;
var init_en = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js"() {
    init_ZodError();
    init_util();
    errorMap = (issue, _ctx) => {
      let message;
      switch (issue.code) {
        case ZodIssueCode.invalid_type:
          if (issue.received === ZodParsedType.undefined) {
            message = "Required";
          } else {
            message = `Expected ${issue.expected}, received ${issue.received}`;
          }
          break;
        case ZodIssueCode.invalid_literal:
          message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
          break;
        case ZodIssueCode.unrecognized_keys:
          message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
          break;
        case ZodIssueCode.invalid_union:
          message = `Invalid input`;
          break;
        case ZodIssueCode.invalid_union_discriminator:
          message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
          break;
        case ZodIssueCode.invalid_enum_value:
          message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
          break;
        case ZodIssueCode.invalid_arguments:
          message = `Invalid function arguments`;
          break;
        case ZodIssueCode.invalid_return_type:
          message = `Invalid function return type`;
          break;
        case ZodIssueCode.invalid_date:
          message = `Invalid date`;
          break;
        case ZodIssueCode.invalid_string:
          if (typeof issue.validation === "object") {
            if ("includes" in issue.validation) {
              message = `Invalid input: must include "${issue.validation.includes}"`;
              if (typeof issue.validation.position === "number") {
                message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
              }
            } else if ("startsWith" in issue.validation) {
              message = `Invalid input: must start with "${issue.validation.startsWith}"`;
            } else if ("endsWith" in issue.validation) {
              message = `Invalid input: must end with "${issue.validation.endsWith}"`;
            } else {
              util.assertNever(issue.validation);
            }
          } else if (issue.validation !== "regex") {
            message = `Invalid ${issue.validation}`;
          } else {
            message = "Invalid";
          }
          break;
        case ZodIssueCode.too_small:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "bigint")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
          else
            message = "Invalid input";
          break;
        case ZodIssueCode.too_big:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "bigint")
            message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
          else
            message = "Invalid input";
          break;
        case ZodIssueCode.custom:
          message = `Invalid input`;
          break;
        case ZodIssueCode.invalid_intersection_types:
          message = `Intersection results could not be merged`;
          break;
        case ZodIssueCode.not_multiple_of:
          message = `Number must be a multiple of ${issue.multipleOf}`;
          break;
        case ZodIssueCode.not_finite:
          message = "Number must be finite";
          break;
        default:
          message = _ctx.defaultError;
          util.assertNever(issue);
      }
      return { message };
    };
    en_default = errorMap;
  }
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var overrideErrorMap;
var init_errors = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js"() {
    init_en();
    overrideErrorMap = en_default;
  }
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var makeIssue, EMPTY_PATH, ParseStatus, INVALID, DIRTY, OK, isAborted, isDirty, isValid, isAsync;
var init_parseUtil = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js"() {
    init_errors();
    init_en();
    makeIssue = (params) => {
      const { data, path: path26, errorMaps, issueData } = params;
      const fullPath = [...path26, ...issueData.path || []];
      const fullIssue = {
        ...issueData,
        path: fullPath
      };
      if (issueData.message !== void 0) {
        return {
          ...issueData,
          path: fullPath,
          message: issueData.message
        };
      }
      let errorMessage = "";
      const maps = errorMaps.filter((m) => !!m).slice().reverse();
      for (const map of maps) {
        errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
      }
      return {
        ...issueData,
        path: fullPath,
        message: errorMessage
      };
    };
    EMPTY_PATH = [];
    ParseStatus = class _ParseStatus {
      constructor() {
        this.value = "valid";
      }
      dirty() {
        if (this.value === "valid")
          this.value = "dirty";
      }
      abort() {
        if (this.value !== "aborted")
          this.value = "aborted";
      }
      static mergeArray(status, results) {
        const arrayValue = [];
        for (const s of results) {
          if (s.status === "aborted")
            return INVALID;
          if (s.status === "dirty")
            status.dirty();
          arrayValue.push(s.value);
        }
        return { status: status.value, value: arrayValue };
      }
      static async mergeObjectAsync(status, pairs) {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value
          });
        }
        return _ParseStatus.mergeObjectSync(status, syncPairs);
      }
      static mergeObjectSync(status, pairs) {
        const finalObject = {};
        for (const pair of pairs) {
          const { key, value } = pair;
          if (key.status === "aborted")
            return INVALID;
          if (value.status === "aborted")
            return INVALID;
          if (key.status === "dirty")
            status.dirty();
          if (value.status === "dirty")
            status.dirty();
          if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
            finalObject[key.value] = value.value;
          }
        }
        return { status: status.value, value: finalObject };
      }
    };
    INVALID = Object.freeze({
      status: "aborted"
    });
    DIRTY = (value) => ({ status: "dirty", value });
    OK = (value) => ({ status: "valid", value });
    isAborted = (x) => x.status === "aborted";
    isDirty = (x) => x.status === "dirty";
    isValid = (x) => x.status === "valid";
    isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
  }
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/typeAliases.js
var init_typeAliases = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/typeAliases.js"() {
  }
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
var init_errorUtil = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js"() {
    (function(errorUtil2) {
      errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
      errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
    })(errorUtil || (errorUtil = {}));
  }
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header2] = jwt.split(".");
    if (!header2)
      return false;
    const base64 = header2.replace(/-/g, "+").replace(/_/g, "/").padEnd(header2.length + (4 - header2.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check2, _params = {}, fatal) {
  if (check2)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check2(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var ParseInputLazyPath, handleResult, ZodType, cuidRegex, cuid2Regex, ulidRegex, uuidRegex, nanoidRegex, jwtRegex, durationRegex, emailRegex, _emojiRegex, emojiRegex, ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex, base64Regex, base64urlRegex, dateRegexSource, dateRegex, ZodString, ZodNumber, ZodBigInt, ZodBoolean, ZodDate, ZodSymbol, ZodUndefined, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodVoid, ZodArray, ZodObject, ZodUnion, getDiscriminator, ZodDiscriminatedUnion, ZodIntersection, ZodTuple, ZodRecord, ZodMap, ZodSet, ZodFunction, ZodLazy, ZodLiteral, ZodEnum, ZodNativeEnum, ZodPromise, ZodEffects, ZodOptional, ZodNullable, ZodDefault, ZodCatch, ZodNaN, BRAND, ZodBranded, ZodPipeline, ZodReadonly, late, ZodFirstPartyTypeKind, instanceOfType, stringType, numberType, nanType, bigIntType, booleanType, dateType, symbolType, undefinedType, nullType, anyType, unknownType, neverType, voidType, arrayType, objectType, strictObjectType, unionType, discriminatedUnionType, intersectionType, tupleType, recordType, mapType, setType, functionType, lazyType, literalType, enumType, nativeEnumType, promiseType, effectsType, optionalType, nullableType, preprocessType, pipelineType, ostring, onumber, oboolean, coerce, NEVER;
var init_types = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js"() {
    init_ZodError();
    init_errors();
    init_errorUtil();
    init_parseUtil();
    init_util();
    ParseInputLazyPath = class {
      constructor(parent, value, path26, key) {
        this._cachedPath = [];
        this.parent = parent;
        this.data = value;
        this._path = path26;
        this._key = key;
      }
      get path() {
        if (!this._cachedPath.length) {
          if (Array.isArray(this._key)) {
            this._cachedPath.push(...this._path, ...this._key);
          } else {
            this._cachedPath.push(...this._path, this._key);
          }
        }
        return this._cachedPath;
      }
    };
    handleResult = (ctx, result) => {
      if (isValid(result)) {
        return { success: true, data: result.value };
      } else {
        if (!ctx.common.issues.length) {
          throw new Error("Validation failed but no issues detected.");
        }
        return {
          success: false,
          get error() {
            if (this._error)
              return this._error;
            const error2 = new ZodError(ctx.common.issues);
            this._error = error2;
            return this._error;
          }
        };
      }
    };
    ZodType = class {
      get description() {
        return this._def.description;
      }
      _getType(input) {
        return getParsedType(input.data);
      }
      _getOrReturnCtx(input, ctx) {
        return ctx || {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        };
      }
      _processInputParams(input) {
        return {
          status: new ParseStatus(),
          ctx: {
            common: input.parent.common,
            data: input.data,
            parsedType: getParsedType(input.data),
            schemaErrorMap: this._def.errorMap,
            path: input.path,
            parent: input.parent
          }
        };
      }
      _parseSync(input) {
        const result = this._parse(input);
        if (isAsync(result)) {
          throw new Error("Synchronous parse encountered promise.");
        }
        return result;
      }
      _parseAsync(input) {
        const result = this._parse(input);
        return Promise.resolve(result);
      }
      parse(data, params) {
        const result = this.safeParse(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      safeParse(data, params) {
        const ctx = {
          common: {
            issues: [],
            async: params?.async ?? false,
            contextualErrorMap: params?.errorMap
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: getParsedType(data)
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
        return handleResult(ctx, result);
      }
      "~validate"(data) {
        const ctx = {
          common: {
            issues: [],
            async: !!this["~standard"].async
          },
          path: [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: getParsedType(data)
        };
        if (!this["~standard"].async) {
          try {
            const result = this._parseSync({ data, path: [], parent: ctx });
            return isValid(result) ? {
              value: result.value
            } : {
              issues: ctx.common.issues
            };
          } catch (err) {
            if (err?.message?.toLowerCase()?.includes("encountered")) {
              this["~standard"].async = true;
            }
            ctx.common = {
              issues: [],
              async: true
            };
          }
        }
        return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        });
      }
      async parseAsync(data, params) {
        const result = await this.safeParseAsync(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      async safeParseAsync(data, params) {
        const ctx = {
          common: {
            issues: [],
            contextualErrorMap: params?.errorMap,
            async: true
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: getParsedType(data)
        };
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
        return handleResult(ctx, result);
      }
      refine(check2, message) {
        const getIssueProperties = (val) => {
          if (typeof message === "string" || typeof message === "undefined") {
            return { message };
          } else if (typeof message === "function") {
            return message(val);
          } else {
            return message;
          }
        };
        return this._refinement((val, ctx) => {
          const result = check2(val);
          const setError = () => ctx.addIssue({
            code: ZodIssueCode.custom,
            ...getIssueProperties(val)
          });
          if (typeof Promise !== "undefined" && result instanceof Promise) {
            return result.then((data) => {
              if (!data) {
                setError();
                return false;
              } else {
                return true;
              }
            });
          }
          if (!result) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      refinement(check2, refinementData) {
        return this._refinement((val, ctx) => {
          if (!check2(val)) {
            ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
            return false;
          } else {
            return true;
          }
        });
      }
      _refinement(refinement) {
        return new ZodEffects({
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "refinement", refinement }
        });
      }
      superRefine(refinement) {
        return this._refinement(refinement);
      }
      constructor(def) {
        this.spa = this.safeParseAsync;
        this._def = def;
        this.parse = this.parse.bind(this);
        this.safeParse = this.safeParse.bind(this);
        this.parseAsync = this.parseAsync.bind(this);
        this.safeParseAsync = this.safeParseAsync.bind(this);
        this.spa = this.spa.bind(this);
        this.refine = this.refine.bind(this);
        this.refinement = this.refinement.bind(this);
        this.superRefine = this.superRefine.bind(this);
        this.optional = this.optional.bind(this);
        this.nullable = this.nullable.bind(this);
        this.nullish = this.nullish.bind(this);
        this.array = this.array.bind(this);
        this.promise = this.promise.bind(this);
        this.or = this.or.bind(this);
        this.and = this.and.bind(this);
        this.transform = this.transform.bind(this);
        this.brand = this.brand.bind(this);
        this.default = this.default.bind(this);
        this.catch = this.catch.bind(this);
        this.describe = this.describe.bind(this);
        this.pipe = this.pipe.bind(this);
        this.readonly = this.readonly.bind(this);
        this.isNullable = this.isNullable.bind(this);
        this.isOptional = this.isOptional.bind(this);
        this["~standard"] = {
          version: 1,
          vendor: "zod",
          validate: (data) => this["~validate"](data)
        };
      }
      optional() {
        return ZodOptional.create(this, this._def);
      }
      nullable() {
        return ZodNullable.create(this, this._def);
      }
      nullish() {
        return this.nullable().optional();
      }
      array() {
        return ZodArray.create(this);
      }
      promise() {
        return ZodPromise.create(this, this._def);
      }
      or(option) {
        return ZodUnion.create([this, option], this._def);
      }
      and(incoming) {
        return ZodIntersection.create(this, incoming, this._def);
      }
      transform(transform) {
        return new ZodEffects({
          ...processCreateParams(this._def),
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "transform", transform }
        });
      }
      default(def) {
        const defaultValueFunc = typeof def === "function" ? def : () => def;
        return new ZodDefault({
          ...processCreateParams(this._def),
          innerType: this,
          defaultValue: defaultValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodDefault
        });
      }
      brand() {
        return new ZodBranded({
          typeName: ZodFirstPartyTypeKind.ZodBranded,
          type: this,
          ...processCreateParams(this._def)
        });
      }
      catch(def) {
        const catchValueFunc = typeof def === "function" ? def : () => def;
        return new ZodCatch({
          ...processCreateParams(this._def),
          innerType: this,
          catchValue: catchValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodCatch
        });
      }
      describe(description) {
        const This = this.constructor;
        return new This({
          ...this._def,
          description
        });
      }
      pipe(target) {
        return ZodPipeline.create(this, target);
      }
      readonly() {
        return ZodReadonly.create(this);
      }
      isOptional() {
        return this.safeParse(void 0).success;
      }
      isNullable() {
        return this.safeParse(null).success;
      }
    };
    cuidRegex = /^c[^\s-]{8,}$/i;
    cuid2Regex = /^[0-9a-z]+$/;
    ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
    uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
    nanoidRegex = /^[a-z0-9_-]{21}$/i;
    jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
    emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
    _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
    ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
    ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
    ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
    base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
    dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
    dateRegex = new RegExp(`^${dateRegexSource}$`);
    ZodString = class _ZodString extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = String(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.string) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.string,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        const status = new ParseStatus();
        let ctx = void 0;
        for (const check2 of this._def.checks) {
          if (check2.kind === "min") {
            if (input.data.length < check2.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check2.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "max") {
            if (input.data.length > check2.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check2.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "length") {
            const tooBig = input.data.length > check2.value;
            const tooSmall = input.data.length < check2.value;
            if (tooBig || tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              if (tooBig) {
                addIssueToContext(ctx, {
                  code: ZodIssueCode.too_big,
                  maximum: check2.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check2.message
                });
              } else if (tooSmall) {
                addIssueToContext(ctx, {
                  code: ZodIssueCode.too_small,
                  minimum: check2.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check2.message
                });
              }
              status.dirty();
            }
          } else if (check2.kind === "email") {
            if (!emailRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "email",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "emoji") {
            if (!emojiRegex) {
              emojiRegex = new RegExp(_emojiRegex, "u");
            }
            if (!emojiRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "emoji",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "uuid") {
            if (!uuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "uuid",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "nanoid") {
            if (!nanoidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "nanoid",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "cuid") {
            if (!cuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "cuid",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "cuid2") {
            if (!cuid2Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "cuid2",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "ulid") {
            if (!ulidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "ulid",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "url") {
            try {
              new URL(input.data);
            } catch {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "url",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "regex") {
            check2.regex.lastIndex = 0;
            const testResult = check2.regex.test(input.data);
            if (!testResult) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "regex",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "trim") {
            input.data = input.data.trim();
          } else if (check2.kind === "includes") {
            if (!input.data.includes(check2.value, check2.position)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: { includes: check2.value, position: check2.position },
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "toLowerCase") {
            input.data = input.data.toLowerCase();
          } else if (check2.kind === "toUpperCase") {
            input.data = input.data.toUpperCase();
          } else if (check2.kind === "startsWith") {
            if (!input.data.startsWith(check2.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: { startsWith: check2.value },
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "endsWith") {
            if (!input.data.endsWith(check2.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: { endsWith: check2.value },
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "datetime") {
            const regex = datetimeRegex(check2);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: "datetime",
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "date") {
            const regex = dateRegex;
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: "date",
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "time") {
            const regex = timeRegex(check2);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: "time",
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "duration") {
            if (!durationRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "duration",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "ip") {
            if (!isValidIP(input.data, check2.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "ip",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "jwt") {
            if (!isValidJWT(input.data, check2.alg)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "jwt",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "cidr") {
            if (!isValidCidr(input.data, check2.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "cidr",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "base64") {
            if (!base64Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "base64",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "base64url") {
            if (!base64urlRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "base64url",
                code: ZodIssueCode.invalid_string,
                message: check2.message
              });
              status.dirty();
            }
          } else {
            util.assertNever(check2);
          }
        }
        return { status: status.value, value: input.data };
      }
      _regex(regex, validation, message) {
        return this.refinement((data) => regex.test(data), {
          validation,
          code: ZodIssueCode.invalid_string,
          ...errorUtil.errToObj(message)
        });
      }
      _addCheck(check2) {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, check2]
        });
      }
      email(message) {
        return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
      }
      url(message) {
        return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
      }
      emoji(message) {
        return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
      }
      uuid(message) {
        return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
      }
      nanoid(message) {
        return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
      }
      cuid(message) {
        return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
      }
      cuid2(message) {
        return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
      }
      ulid(message) {
        return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
      }
      base64(message) {
        return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
      }
      base64url(message) {
        return this._addCheck({
          kind: "base64url",
          ...errorUtil.errToObj(message)
        });
      }
      jwt(options2) {
        return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options2) });
      }
      ip(options2) {
        return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options2) });
      }
      cidr(options2) {
        return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options2) });
      }
      datetime(options2) {
        if (typeof options2 === "string") {
          return this._addCheck({
            kind: "datetime",
            precision: null,
            offset: false,
            local: false,
            message: options2
          });
        }
        return this._addCheck({
          kind: "datetime",
          precision: typeof options2?.precision === "undefined" ? null : options2?.precision,
          offset: options2?.offset ?? false,
          local: options2?.local ?? false,
          ...errorUtil.errToObj(options2?.message)
        });
      }
      date(message) {
        return this._addCheck({ kind: "date", message });
      }
      time(options2) {
        if (typeof options2 === "string") {
          return this._addCheck({
            kind: "time",
            precision: null,
            message: options2
          });
        }
        return this._addCheck({
          kind: "time",
          precision: typeof options2?.precision === "undefined" ? null : options2?.precision,
          ...errorUtil.errToObj(options2?.message)
        });
      }
      duration(message) {
        return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
      }
      regex(regex, message) {
        return this._addCheck({
          kind: "regex",
          regex,
          ...errorUtil.errToObj(message)
        });
      }
      includes(value, options2) {
        return this._addCheck({
          kind: "includes",
          value,
          position: options2?.position,
          ...errorUtil.errToObj(options2?.message)
        });
      }
      startsWith(value, message) {
        return this._addCheck({
          kind: "startsWith",
          value,
          ...errorUtil.errToObj(message)
        });
      }
      endsWith(value, message) {
        return this._addCheck({
          kind: "endsWith",
          value,
          ...errorUtil.errToObj(message)
        });
      }
      min(minLength, message) {
        return this._addCheck({
          kind: "min",
          value: minLength,
          ...errorUtil.errToObj(message)
        });
      }
      max(maxLength, message) {
        return this._addCheck({
          kind: "max",
          value: maxLength,
          ...errorUtil.errToObj(message)
        });
      }
      length(len, message) {
        return this._addCheck({
          kind: "length",
          value: len,
          ...errorUtil.errToObj(message)
        });
      }
      /**
       * Equivalent to `.min(1)`
       */
      nonempty(message) {
        return this.min(1, errorUtil.errToObj(message));
      }
      trim() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "trim" }]
        });
      }
      toLowerCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toLowerCase" }]
        });
      }
      toUpperCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toUpperCase" }]
        });
      }
      get isDatetime() {
        return !!this._def.checks.find((ch) => ch.kind === "datetime");
      }
      get isDate() {
        return !!this._def.checks.find((ch) => ch.kind === "date");
      }
      get isTime() {
        return !!this._def.checks.find((ch) => ch.kind === "time");
      }
      get isDuration() {
        return !!this._def.checks.find((ch) => ch.kind === "duration");
      }
      get isEmail() {
        return !!this._def.checks.find((ch) => ch.kind === "email");
      }
      get isURL() {
        return !!this._def.checks.find((ch) => ch.kind === "url");
      }
      get isEmoji() {
        return !!this._def.checks.find((ch) => ch.kind === "emoji");
      }
      get isUUID() {
        return !!this._def.checks.find((ch) => ch.kind === "uuid");
      }
      get isNANOID() {
        return !!this._def.checks.find((ch) => ch.kind === "nanoid");
      }
      get isCUID() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid");
      }
      get isCUID2() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid2");
      }
      get isULID() {
        return !!this._def.checks.find((ch) => ch.kind === "ulid");
      }
      get isIP() {
        return !!this._def.checks.find((ch) => ch.kind === "ip");
      }
      get isCIDR() {
        return !!this._def.checks.find((ch) => ch.kind === "cidr");
      }
      get isBase64() {
        return !!this._def.checks.find((ch) => ch.kind === "base64");
      }
      get isBase64url() {
        return !!this._def.checks.find((ch) => ch.kind === "base64url");
      }
      get minLength() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxLength() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    ZodString.create = (params) => {
      return new ZodString({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodString,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    ZodNumber = class _ZodNumber extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
        this.step = this.multipleOf;
      }
      _parse(input) {
        if (this._def.coerce) {
          input.data = Number(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.number) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.number,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        let ctx = void 0;
        const status = new ParseStatus();
        for (const check2 of this._def.checks) {
          if (check2.kind === "int") {
            if (!util.isInteger(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: "integer",
                received: "float",
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "min") {
            const tooSmall = check2.inclusive ? input.data < check2.value : input.data <= check2.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check2.value,
                type: "number",
                inclusive: check2.inclusive,
                exact: false,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "max") {
            const tooBig = check2.inclusive ? input.data > check2.value : input.data >= check2.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check2.value,
                type: "number",
                inclusive: check2.inclusive,
                exact: false,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "multipleOf") {
            if (floatSafeRemainder(input.data, check2.value) !== 0) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.not_multiple_of,
                multipleOf: check2.value,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "finite") {
            if (!Number.isFinite(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.not_finite,
                message: check2.message
              });
              status.dirty();
            }
          } else {
            util.assertNever(check2);
          }
        }
        return { status: status.value, value: input.data };
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodNumber({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check2) {
        return new _ZodNumber({
          ...this._def,
          checks: [...this._def.checks, check2]
        });
      }
      int(message) {
        return this._addCheck({
          kind: "int",
          message: errorUtil.toString(message)
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil.toString(message)
        });
      }
      finite(message) {
        return this._addCheck({
          kind: "finite",
          message: errorUtil.toString(message)
        });
      }
      safe(message) {
        return this._addCheck({
          kind: "min",
          inclusive: true,
          value: Number.MIN_SAFE_INTEGER,
          message: errorUtil.toString(message)
        })._addCheck({
          kind: "max",
          inclusive: true,
          value: Number.MAX_SAFE_INTEGER,
          message: errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
      get isInt() {
        return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
      }
      get isFinite() {
        let max = null;
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
            return true;
          } else if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          } else if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return Number.isFinite(min) && Number.isFinite(max);
      }
    };
    ZodNumber.create = (params) => {
      return new ZodNumber({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodNumber,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    ZodBigInt = class _ZodBigInt extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
      }
      _parse(input) {
        if (this._def.coerce) {
          try {
            input.data = BigInt(input.data);
          } catch {
            return this._getInvalidInput(input);
          }
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.bigint) {
          return this._getInvalidInput(input);
        }
        let ctx = void 0;
        const status = new ParseStatus();
        for (const check2 of this._def.checks) {
          if (check2.kind === "min") {
            const tooSmall = check2.inclusive ? input.data < check2.value : input.data <= check2.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                type: "bigint",
                minimum: check2.value,
                inclusive: check2.inclusive,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "max") {
            const tooBig = check2.inclusive ? input.data > check2.value : input.data >= check2.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                type: "bigint",
                maximum: check2.value,
                inclusive: check2.inclusive,
                message: check2.message
              });
              status.dirty();
            }
          } else if (check2.kind === "multipleOf") {
            if (input.data % check2.value !== BigInt(0)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.not_multiple_of,
                multipleOf: check2.value,
                message: check2.message
              });
              status.dirty();
            }
          } else {
            util.assertNever(check2);
          }
        }
        return { status: status.value, value: input.data };
      }
      _getInvalidInput(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.bigint,
          received: ctx.parsedType
        });
        return INVALID;
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodBigInt({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check2) {
        return new _ZodBigInt({
          ...this._def,
          checks: [...this._def.checks, check2]
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    ZodBigInt.create = (params) => {
      return new ZodBigInt({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodBigInt,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    ZodBoolean = class extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = Boolean(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.boolean) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.boolean,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodBoolean.create = (params) => {
      return new ZodBoolean({
        typeName: ZodFirstPartyTypeKind.ZodBoolean,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    ZodDate = class _ZodDate extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = new Date(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.date) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.date,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        if (Number.isNaN(input.data.getTime())) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_date
          });
          return INVALID;
        }
        const status = new ParseStatus();
        let ctx = void 0;
        for (const check2 of this._def.checks) {
          if (check2.kind === "min") {
            if (input.data.getTime() < check2.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                message: check2.message,
                inclusive: true,
                exact: false,
                minimum: check2.value,
                type: "date"
              });
              status.dirty();
            }
          } else if (check2.kind === "max") {
            if (input.data.getTime() > check2.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                message: check2.message,
                inclusive: true,
                exact: false,
                maximum: check2.value,
                type: "date"
              });
              status.dirty();
            }
          } else {
            util.assertNever(check2);
          }
        }
        return {
          status: status.value,
          value: new Date(input.data.getTime())
        };
      }
      _addCheck(check2) {
        return new _ZodDate({
          ...this._def,
          checks: [...this._def.checks, check2]
        });
      }
      min(minDate, message) {
        return this._addCheck({
          kind: "min",
          value: minDate.getTime(),
          message: errorUtil.toString(message)
        });
      }
      max(maxDate, message) {
        return this._addCheck({
          kind: "max",
          value: maxDate.getTime(),
          message: errorUtil.toString(message)
        });
      }
      get minDate() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min != null ? new Date(min) : null;
      }
      get maxDate() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max != null ? new Date(max) : null;
      }
    };
    ZodDate.create = (params) => {
      return new ZodDate({
        checks: [],
        coerce: params?.coerce || false,
        typeName: ZodFirstPartyTypeKind.ZodDate,
        ...processCreateParams(params)
      });
    };
    ZodSymbol = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.symbol) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.symbol,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodSymbol.create = (params) => {
      return new ZodSymbol({
        typeName: ZodFirstPartyTypeKind.ZodSymbol,
        ...processCreateParams(params)
      });
    };
    ZodUndefined = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.undefined,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodUndefined.create = (params) => {
      return new ZodUndefined({
        typeName: ZodFirstPartyTypeKind.ZodUndefined,
        ...processCreateParams(params)
      });
    };
    ZodNull = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.null) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.null,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodNull.create = (params) => {
      return new ZodNull({
        typeName: ZodFirstPartyTypeKind.ZodNull,
        ...processCreateParams(params)
      });
    };
    ZodAny = class extends ZodType {
      constructor() {
        super(...arguments);
        this._any = true;
      }
      _parse(input) {
        return OK(input.data);
      }
    };
    ZodAny.create = (params) => {
      return new ZodAny({
        typeName: ZodFirstPartyTypeKind.ZodAny,
        ...processCreateParams(params)
      });
    };
    ZodUnknown = class extends ZodType {
      constructor() {
        super(...arguments);
        this._unknown = true;
      }
      _parse(input) {
        return OK(input.data);
      }
    };
    ZodUnknown.create = (params) => {
      return new ZodUnknown({
        typeName: ZodFirstPartyTypeKind.ZodUnknown,
        ...processCreateParams(params)
      });
    };
    ZodNever = class extends ZodType {
      _parse(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.never,
          received: ctx.parsedType
        });
        return INVALID;
      }
    };
    ZodNever.create = (params) => {
      return new ZodNever({
        typeName: ZodFirstPartyTypeKind.ZodNever,
        ...processCreateParams(params)
      });
    };
    ZodVoid = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.void,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodVoid.create = (params) => {
      return new ZodVoid({
        typeName: ZodFirstPartyTypeKind.ZodVoid,
        ...processCreateParams(params)
      });
    };
    ZodArray = class _ZodArray extends ZodType {
      _parse(input) {
        const { ctx, status } = this._processInputParams(input);
        const def = this._def;
        if (ctx.parsedType !== ZodParsedType.array) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.array,
            received: ctx.parsedType
          });
          return INVALID;
        }
        if (def.exactLength !== null) {
          const tooBig = ctx.data.length > def.exactLength.value;
          const tooSmall = ctx.data.length < def.exactLength.value;
          if (tooBig || tooSmall) {
            addIssueToContext(ctx, {
              code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
              minimum: tooSmall ? def.exactLength.value : void 0,
              maximum: tooBig ? def.exactLength.value : void 0,
              type: "array",
              inclusive: true,
              exact: true,
              message: def.exactLength.message
            });
            status.dirty();
          }
        }
        if (def.minLength !== null) {
          if (ctx.data.length < def.minLength.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: def.minLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.minLength.message
            });
            status.dirty();
          }
        }
        if (def.maxLength !== null) {
          if (ctx.data.length > def.maxLength.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: def.maxLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.maxLength.message
            });
            status.dirty();
          }
        }
        if (ctx.common.async) {
          return Promise.all([...ctx.data].map((item, i) => {
            return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
          })).then((result2) => {
            return ParseStatus.mergeArray(status, result2);
          });
        }
        const result = [...ctx.data].map((item, i) => {
          return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        });
        return ParseStatus.mergeArray(status, result);
      }
      get element() {
        return this._def.type;
      }
      min(minLength, message) {
        return new _ZodArray({
          ...this._def,
          minLength: { value: minLength, message: errorUtil.toString(message) }
        });
      }
      max(maxLength, message) {
        return new _ZodArray({
          ...this._def,
          maxLength: { value: maxLength, message: errorUtil.toString(message) }
        });
      }
      length(len, message) {
        return new _ZodArray({
          ...this._def,
          exactLength: { value: len, message: errorUtil.toString(message) }
        });
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    ZodArray.create = (schema, params) => {
      return new ZodArray({
        type: schema,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: ZodFirstPartyTypeKind.ZodArray,
        ...processCreateParams(params)
      });
    };
    ZodObject = class _ZodObject extends ZodType {
      constructor() {
        super(...arguments);
        this._cached = null;
        this.nonstrict = this.passthrough;
        this.augment = this.extend;
      }
      _getCached() {
        if (this._cached !== null)
          return this._cached;
        const shape = this._def.shape();
        const keys = util.objectKeys(shape);
        this._cached = { shape, keys };
        return this._cached;
      }
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.object) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.object,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        const { status, ctx } = this._processInputParams(input);
        const { shape, keys: shapeKeys } = this._getCached();
        const extraKeys = [];
        if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
          for (const key in ctx.data) {
            if (!shapeKeys.includes(key)) {
              extraKeys.push(key);
            }
          }
        }
        const pairs = [];
        for (const key of shapeKeys) {
          const keyValidator = shape[key];
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (this._def.catchall instanceof ZodNever) {
          const unknownKeys = this._def.unknownKeys;
          if (unknownKeys === "passthrough") {
            for (const key of extraKeys) {
              pairs.push({
                key: { status: "valid", value: key },
                value: { status: "valid", value: ctx.data[key] }
              });
            }
          } else if (unknownKeys === "strict") {
            if (extraKeys.length > 0) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.unrecognized_keys,
                keys: extraKeys
              });
              status.dirty();
            }
          } else if (unknownKeys === "strip") {
          } else {
            throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
          }
        } else {
          const catchall = this._def.catchall;
          for (const key of extraKeys) {
            const value = ctx.data[key];
            pairs.push({
              key: { status: "valid", value: key },
              value: catchall._parse(
                new ParseInputLazyPath(ctx, value, ctx.path, key)
                //, ctx.child(key), value, getParsedType(value)
              ),
              alwaysSet: key in ctx.data
            });
          }
        }
        if (ctx.common.async) {
          return Promise.resolve().then(async () => {
            const syncPairs = [];
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              syncPairs.push({
                key,
                value,
                alwaysSet: pair.alwaysSet
              });
            }
            return syncPairs;
          }).then((syncPairs) => {
            return ParseStatus.mergeObjectSync(status, syncPairs);
          });
        } else {
          return ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get shape() {
        return this._def.shape();
      }
      strict(message) {
        errorUtil.errToObj;
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strict",
          ...message !== void 0 ? {
            errorMap: (issue, ctx) => {
              const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
              if (issue.code === "unrecognized_keys")
                return {
                  message: errorUtil.errToObj(message).message ?? defaultError
                };
              return {
                message: defaultError
              };
            }
          } : {}
        });
      }
      strip() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strip"
        });
      }
      passthrough() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "passthrough"
        });
      }
      // const AugmentFactory =
      //   <Def extends ZodObjectDef>(def: Def) =>
      //   <Augmentation extends ZodRawShape>(
      //     augmentation: Augmentation
      //   ): ZodObject<
      //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
      //     Def["unknownKeys"],
      //     Def["catchall"]
      //   > => {
      //     return new ZodObject({
      //       ...def,
      //       shape: () => ({
      //         ...def.shape(),
      //         ...augmentation,
      //       }),
      //     }) as any;
      //   };
      extend(augmentation) {
        return new _ZodObject({
          ...this._def,
          shape: () => ({
            ...this._def.shape(),
            ...augmentation
          })
        });
      }
      /**
       * Prior to zod@1.0.12 there was a bug in the
       * inferred type of merged objects. Please
       * upgrade if you are experiencing issues.
       */
      merge(merging) {
        const merged = new _ZodObject({
          unknownKeys: merging._def.unknownKeys,
          catchall: merging._def.catchall,
          shape: () => ({
            ...this._def.shape(),
            ...merging._def.shape()
          }),
          typeName: ZodFirstPartyTypeKind.ZodObject
        });
        return merged;
      }
      // merge<
      //   Incoming extends AnyZodObject,
      //   Augmentation extends Incoming["shape"],
      //   NewOutput extends {
      //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
      //       ? Augmentation[k]["_output"]
      //       : k extends keyof Output
      //       ? Output[k]
      //       : never;
      //   },
      //   NewInput extends {
      //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
      //       ? Augmentation[k]["_input"]
      //       : k extends keyof Input
      //       ? Input[k]
      //       : never;
      //   }
      // >(
      //   merging: Incoming
      // ): ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"],
      //   NewOutput,
      //   NewInput
      // > {
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      setKey(key, schema) {
        return this.augment({ [key]: schema });
      }
      // merge<Incoming extends AnyZodObject>(
      //   merging: Incoming
      // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
      // ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"]
      // > {
      //   // const mergedShape = objectUtil.mergeShapes(
      //   //   this._def.shape(),
      //   //   merging._def.shape()
      //   // );
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      catchall(index) {
        return new _ZodObject({
          ...this._def,
          catchall: index
        });
      }
      pick(mask) {
        const shape = {};
        for (const key of util.objectKeys(mask)) {
          if (mask[key] && this.shape[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      omit(mask) {
        const shape = {};
        for (const key of util.objectKeys(this.shape)) {
          if (!mask[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      /**
       * @deprecated
       */
      deepPartial() {
        return deepPartialify(this);
      }
      partial(mask) {
        const newShape = {};
        for (const key of util.objectKeys(this.shape)) {
          const fieldSchema = this.shape[key];
          if (mask && !mask[key]) {
            newShape[key] = fieldSchema;
          } else {
            newShape[key] = fieldSchema.optional();
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      required(mask) {
        const newShape = {};
        for (const key of util.objectKeys(this.shape)) {
          if (mask && !mask[key]) {
            newShape[key] = this.shape[key];
          } else {
            const fieldSchema = this.shape[key];
            let newField = fieldSchema;
            while (newField instanceof ZodOptional) {
              newField = newField._def.innerType;
            }
            newShape[key] = newField;
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      keyof() {
        return createZodEnum(util.objectKeys(this.shape));
      }
    };
    ZodObject.create = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.strictCreate = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strict",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.lazycreate = (shape, params) => {
      return new ZodObject({
        shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodUnion = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const options2 = this._def.options;
        function handleResults(results) {
          for (const result of results) {
            if (result.result.status === "valid") {
              return result.result;
            }
          }
          for (const result of results) {
            if (result.result.status === "dirty") {
              ctx.common.issues.push(...result.ctx.common.issues);
              return result.result;
            }
          }
          const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_union,
            unionErrors
          });
          return INVALID;
        }
        if (ctx.common.async) {
          return Promise.all(options2.map(async (option) => {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            return {
              result: await option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: childCtx
              }),
              ctx: childCtx
            };
          })).then(handleResults);
        } else {
          let dirty = void 0;
          const issues = [];
          for (const option of options2) {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            const result = option._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            });
            if (result.status === "valid") {
              return result;
            } else if (result.status === "dirty" && !dirty) {
              dirty = { result, ctx: childCtx };
            }
            if (childCtx.common.issues.length) {
              issues.push(childCtx.common.issues);
            }
          }
          if (dirty) {
            ctx.common.issues.push(...dirty.ctx.common.issues);
            return dirty.result;
          }
          const unionErrors = issues.map((issues2) => new ZodError(issues2));
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_union,
            unionErrors
          });
          return INVALID;
        }
      }
      get options() {
        return this._def.options;
      }
    };
    ZodUnion.create = (types, params) => {
      return new ZodUnion({
        options: types,
        typeName: ZodFirstPartyTypeKind.ZodUnion,
        ...processCreateParams(params)
      });
    };
    getDiscriminator = (type) => {
      if (type instanceof ZodLazy) {
        return getDiscriminator(type.schema);
      } else if (type instanceof ZodEffects) {
        return getDiscriminator(type.innerType());
      } else if (type instanceof ZodLiteral) {
        return [type.value];
      } else if (type instanceof ZodEnum) {
        return type.options;
      } else if (type instanceof ZodNativeEnum) {
        return util.objectValues(type.enum);
      } else if (type instanceof ZodDefault) {
        return getDiscriminator(type._def.innerType);
      } else if (type instanceof ZodUndefined) {
        return [void 0];
      } else if (type instanceof ZodNull) {
        return [null];
      } else if (type instanceof ZodOptional) {
        return [void 0, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodNullable) {
        return [null, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodBranded) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodReadonly) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodCatch) {
        return getDiscriminator(type._def.innerType);
      } else {
        return [];
      }
    };
    ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.object,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const discriminator = this.discriminator;
        const discriminatorValue = ctx.data[discriminator];
        const option = this.optionsMap.get(discriminatorValue);
        if (!option) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_union_discriminator,
            options: Array.from(this.optionsMap.keys()),
            path: [discriminator]
          });
          return INVALID;
        }
        if (ctx.common.async) {
          return option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        } else {
          return option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        }
      }
      get discriminator() {
        return this._def.discriminator;
      }
      get options() {
        return this._def.options;
      }
      get optionsMap() {
        return this._def.optionsMap;
      }
      /**
       * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
       * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
       * have a different value for each object in the union.
       * @param discriminator the name of the discriminator property
       * @param types an array of object schemas
       * @param params
       */
      static create(discriminator, options2, params) {
        const optionsMap = /* @__PURE__ */ new Map();
        for (const type of options2) {
          const discriminatorValues = getDiscriminator(type.shape[discriminator]);
          if (!discriminatorValues.length) {
            throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
          }
          for (const value of discriminatorValues) {
            if (optionsMap.has(value)) {
              throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
            }
            optionsMap.set(value, type);
          }
        }
        return new _ZodDiscriminatedUnion({
          typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
          discriminator,
          options: options2,
          optionsMap,
          ...processCreateParams(params)
        });
      }
    };
    ZodIntersection = class extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const handleParsed = (parsedLeft, parsedRight) => {
          if (isAborted(parsedLeft) || isAborted(parsedRight)) {
            return INVALID;
          }
          const merged = mergeValues(parsedLeft.value, parsedRight.value);
          if (!merged.valid) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_intersection_types
            });
            return INVALID;
          }
          if (isDirty(parsedLeft) || isDirty(parsedRight)) {
            status.dirty();
          }
          return { status: status.value, value: merged.data };
        };
        if (ctx.common.async) {
          return Promise.all([
            this._def.left._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            }),
            this._def.right._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            })
          ]).then(([left, right]) => handleParsed(left, right));
        } else {
          return handleParsed(this._def.left._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }), this._def.right._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }));
        }
      }
    };
    ZodIntersection.create = (left, right, params) => {
      return new ZodIntersection({
        left,
        right,
        typeName: ZodFirstPartyTypeKind.ZodIntersection,
        ...processCreateParams(params)
      });
    };
    ZodTuple = class _ZodTuple extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.array) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.array,
            received: ctx.parsedType
          });
          return INVALID;
        }
        if (ctx.data.length < this._def.items.length) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          return INVALID;
        }
        const rest = this._def.rest;
        if (!rest && ctx.data.length > this._def.items.length) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          status.dirty();
        }
        const items = [...ctx.data].map((item, itemIndex) => {
          const schema = this._def.items[itemIndex] || this._def.rest;
          if (!schema)
            return null;
          return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
        }).filter((x) => !!x);
        if (ctx.common.async) {
          return Promise.all(items).then((results) => {
            return ParseStatus.mergeArray(status, results);
          });
        } else {
          return ParseStatus.mergeArray(status, items);
        }
      }
      get items() {
        return this._def.items;
      }
      rest(rest) {
        return new _ZodTuple({
          ...this._def,
          rest
        });
      }
    };
    ZodTuple.create = (schemas, params) => {
      if (!Array.isArray(schemas)) {
        throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
      }
      return new ZodTuple({
        items: schemas,
        typeName: ZodFirstPartyTypeKind.ZodTuple,
        rest: null,
        ...processCreateParams(params)
      });
    };
    ZodRecord = class _ZodRecord extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.object,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const pairs = [];
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        for (const key in ctx.data) {
          pairs.push({
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
            value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (ctx.common.async) {
          return ParseStatus.mergeObjectAsync(status, pairs);
        } else {
          return ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get element() {
        return this._def.valueType;
      }
      static create(first, second, third) {
        if (second instanceof ZodType) {
          return new _ZodRecord({
            keyType: first,
            valueType: second,
            typeName: ZodFirstPartyTypeKind.ZodRecord,
            ...processCreateParams(third)
          });
        }
        return new _ZodRecord({
          keyType: ZodString.create(),
          valueType: first,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(second)
        });
      }
    };
    ZodMap = class extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.map) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.map,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        const pairs = [...ctx.data.entries()].map(([key, value], index) => {
          return {
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
            value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
          };
        });
        if (ctx.common.async) {
          const finalMap = /* @__PURE__ */ new Map();
          return Promise.resolve().then(async () => {
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              if (key.status === "aborted" || value.status === "aborted") {
                return INVALID;
              }
              if (key.status === "dirty" || value.status === "dirty") {
                status.dirty();
              }
              finalMap.set(key.value, value.value);
            }
            return { status: status.value, value: finalMap };
          });
        } else {
          const finalMap = /* @__PURE__ */ new Map();
          for (const pair of pairs) {
            const key = pair.key;
            const value = pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        }
      }
    };
    ZodMap.create = (keyType, valueType, params) => {
      return new ZodMap({
        valueType,
        keyType,
        typeName: ZodFirstPartyTypeKind.ZodMap,
        ...processCreateParams(params)
      });
    };
    ZodSet = class _ZodSet extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.set) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.set,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const def = this._def;
        if (def.minSize !== null) {
          if (ctx.data.size < def.minSize.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: def.minSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.minSize.message
            });
            status.dirty();
          }
        }
        if (def.maxSize !== null) {
          if (ctx.data.size > def.maxSize.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: def.maxSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.maxSize.message
            });
            status.dirty();
          }
        }
        const valueType = this._def.valueType;
        function finalizeSet(elements2) {
          const parsedSet = /* @__PURE__ */ new Set();
          for (const element of elements2) {
            if (element.status === "aborted")
              return INVALID;
            if (element.status === "dirty")
              status.dirty();
            parsedSet.add(element.value);
          }
          return { status: status.value, value: parsedSet };
        }
        const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
        if (ctx.common.async) {
          return Promise.all(elements).then((elements2) => finalizeSet(elements2));
        } else {
          return finalizeSet(elements);
        }
      }
      min(minSize, message) {
        return new _ZodSet({
          ...this._def,
          minSize: { value: minSize, message: errorUtil.toString(message) }
        });
      }
      max(maxSize, message) {
        return new _ZodSet({
          ...this._def,
          maxSize: { value: maxSize, message: errorUtil.toString(message) }
        });
      }
      size(size, message) {
        return this.min(size, message).max(size, message);
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    ZodSet.create = (valueType, params) => {
      return new ZodSet({
        valueType,
        minSize: null,
        maxSize: null,
        typeName: ZodFirstPartyTypeKind.ZodSet,
        ...processCreateParams(params)
      });
    };
    ZodFunction = class _ZodFunction extends ZodType {
      constructor() {
        super(...arguments);
        this.validate = this.implement;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.function) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.function,
            received: ctx.parsedType
          });
          return INVALID;
        }
        function makeArgsIssue(args, error2) {
          return makeIssue({
            data: args,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
            issueData: {
              code: ZodIssueCode.invalid_arguments,
              argumentsError: error2
            }
          });
        }
        function makeReturnsIssue(returns, error2) {
          return makeIssue({
            data: returns,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
            issueData: {
              code: ZodIssueCode.invalid_return_type,
              returnTypeError: error2
            }
          });
        }
        const params = { errorMap: ctx.common.contextualErrorMap };
        const fn = ctx.data;
        if (this._def.returns instanceof ZodPromise) {
          const me = this;
          return OK(async function(...args) {
            const error2 = new ZodError([]);
            const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
              error2.addIssue(makeArgsIssue(args, e));
              throw error2;
            });
            const result = await Reflect.apply(fn, this, parsedArgs);
            const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
              error2.addIssue(makeReturnsIssue(result, e));
              throw error2;
            });
            return parsedReturns;
          });
        } else {
          const me = this;
          return OK(function(...args) {
            const parsedArgs = me._def.args.safeParse(args, params);
            if (!parsedArgs.success) {
              throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
            }
            const result = Reflect.apply(fn, this, parsedArgs.data);
            const parsedReturns = me._def.returns.safeParse(result, params);
            if (!parsedReturns.success) {
              throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
            }
            return parsedReturns.data;
          });
        }
      }
      parameters() {
        return this._def.args;
      }
      returnType() {
        return this._def.returns;
      }
      args(...items) {
        return new _ZodFunction({
          ...this._def,
          args: ZodTuple.create(items).rest(ZodUnknown.create())
        });
      }
      returns(returnType) {
        return new _ZodFunction({
          ...this._def,
          returns: returnType
        });
      }
      implement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      strictImplement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      static create(args, returns, params) {
        return new _ZodFunction({
          args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
          returns: returns || ZodUnknown.create(),
          typeName: ZodFirstPartyTypeKind.ZodFunction,
          ...processCreateParams(params)
        });
      }
    };
    ZodLazy = class extends ZodType {
      get schema() {
        return this._def.getter();
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const lazySchema = this._def.getter();
        return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
      }
    };
    ZodLazy.create = (getter, params) => {
      return new ZodLazy({
        getter,
        typeName: ZodFirstPartyTypeKind.ZodLazy,
        ...processCreateParams(params)
      });
    };
    ZodLiteral = class extends ZodType {
      _parse(input) {
        if (input.data !== this._def.value) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            received: ctx.data,
            code: ZodIssueCode.invalid_literal,
            expected: this._def.value
          });
          return INVALID;
        }
        return { status: "valid", value: input.data };
      }
      get value() {
        return this._def.value;
      }
    };
    ZodLiteral.create = (value, params) => {
      return new ZodLiteral({
        value,
        typeName: ZodFirstPartyTypeKind.ZodLiteral,
        ...processCreateParams(params)
      });
    };
    ZodEnum = class _ZodEnum extends ZodType {
      _parse(input) {
        if (typeof input.data !== "string") {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          addIssueToContext(ctx, {
            expected: util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodIssueCode.invalid_type
          });
          return INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(this._def.values);
        }
        if (!this._cache.has(input.data)) {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          addIssueToContext(ctx, {
            received: ctx.data,
            code: ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return INVALID;
        }
        return OK(input.data);
      }
      get options() {
        return this._def.values;
      }
      get enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Values() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      extract(values, newDef = this._def) {
        return _ZodEnum.create(values, {
          ...this._def,
          ...newDef
        });
      }
      exclude(values, newDef = this._def) {
        return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
          ...this._def,
          ...newDef
        });
      }
    };
    ZodEnum.create = createZodEnum;
    ZodNativeEnum = class extends ZodType {
      _parse(input) {
        const nativeEnumValues = util.getValidEnumValues(this._def.values);
        const ctx = this._getOrReturnCtx(input);
        if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
          const expectedValues = util.objectValues(nativeEnumValues);
          addIssueToContext(ctx, {
            expected: util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodIssueCode.invalid_type
          });
          return INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(util.getValidEnumValues(this._def.values));
        }
        if (!this._cache.has(input.data)) {
          const expectedValues = util.objectValues(nativeEnumValues);
          addIssueToContext(ctx, {
            received: ctx.data,
            code: ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return INVALID;
        }
        return OK(input.data);
      }
      get enum() {
        return this._def.values;
      }
    };
    ZodNativeEnum.create = (values, params) => {
      return new ZodNativeEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
        ...processCreateParams(params)
      });
    };
    ZodPromise = class extends ZodType {
      unwrap() {
        return this._def.type;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.promise,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
        return OK(promisified.then((data) => {
          return this._def.type.parseAsync(data, {
            path: ctx.path,
            errorMap: ctx.common.contextualErrorMap
          });
        }));
      }
    };
    ZodPromise.create = (schema, params) => {
      return new ZodPromise({
        type: schema,
        typeName: ZodFirstPartyTypeKind.ZodPromise,
        ...processCreateParams(params)
      });
    };
    ZodEffects = class extends ZodType {
      innerType() {
        return this._def.schema;
      }
      sourceType() {
        return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const effect = this._def.effect || null;
        const checkCtx = {
          addIssue: (arg) => {
            addIssueToContext(ctx, arg);
            if (arg.fatal) {
              status.abort();
            } else {
              status.dirty();
            }
          },
          get path() {
            return ctx.path;
          }
        };
        checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
        if (effect.type === "preprocess") {
          const processed = effect.transform(ctx.data, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(processed).then(async (processed2) => {
              if (status.value === "aborted")
                return INVALID;
              const result = await this._def.schema._parseAsync({
                data: processed2,
                path: ctx.path,
                parent: ctx
              });
              if (result.status === "aborted")
                return INVALID;
              if (result.status === "dirty")
                return DIRTY(result.value);
              if (status.value === "dirty")
                return DIRTY(result.value);
              return result;
            });
          } else {
            if (status.value === "aborted")
              return INVALID;
            const result = this._def.schema._parseSync({
              data: processed,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          }
        }
        if (effect.type === "refinement") {
          const executeRefinement = (acc) => {
            const result = effect.refinement(acc, checkCtx);
            if (ctx.common.async) {
              return Promise.resolve(result);
            }
            if (result instanceof Promise) {
              throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
            }
            return acc;
          };
          if (ctx.common.async === false) {
            const inner = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            executeRefinement(inner.value);
            return { status: status.value, value: inner.value };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
              if (inner.status === "aborted")
                return INVALID;
              if (inner.status === "dirty")
                status.dirty();
              return executeRefinement(inner.value).then(() => {
                return { status: status.value, value: inner.value };
              });
            });
          }
        }
        if (effect.type === "transform") {
          if (ctx.common.async === false) {
            const base = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (!isValid(base))
              return INVALID;
            const result = effect.transform(base.value, checkCtx);
            if (result instanceof Promise) {
              throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
            }
            return { status: status.value, value: result };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
              if (!isValid(base))
                return INVALID;
              return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
                status: status.value,
                value: result
              }));
            });
          }
        }
        util.assertNever(effect);
      }
    };
    ZodEffects.create = (schema, effect, params) => {
      return new ZodEffects({
        schema,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect,
        ...processCreateParams(params)
      });
    };
    ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
      return new ZodEffects({
        schema,
        effect: { type: "preprocess", transform: preprocess },
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        ...processCreateParams(params)
      });
    };
    ZodOptional = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.undefined) {
          return OK(void 0);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    ZodOptional.create = (type, params) => {
      return new ZodOptional({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodOptional,
        ...processCreateParams(params)
      });
    };
    ZodNullable = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.null) {
          return OK(null);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    ZodNullable.create = (type, params) => {
      return new ZodNullable({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodNullable,
        ...processCreateParams(params)
      });
    };
    ZodDefault = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        let data = ctx.data;
        if (ctx.parsedType === ZodParsedType.undefined) {
          data = this._def.defaultValue();
        }
        return this._def.innerType._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      removeDefault() {
        return this._def.innerType;
      }
    };
    ZodDefault.create = (type, params) => {
      return new ZodDefault({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodDefault,
        defaultValue: typeof params.default === "function" ? params.default : () => params.default,
        ...processCreateParams(params)
      });
    };
    ZodCatch = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const newCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          }
        };
        const result = this._def.innerType._parse({
          data: newCtx.data,
          path: newCtx.path,
          parent: {
            ...newCtx
          }
        });
        if (isAsync(result)) {
          return result.then((result2) => {
            return {
              status: "valid",
              value: result2.status === "valid" ? result2.value : this._def.catchValue({
                get error() {
                  return new ZodError(newCtx.common.issues);
                },
                input: newCtx.data
              })
            };
          });
        } else {
          return {
            status: "valid",
            value: result.status === "valid" ? result.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        }
      }
      removeCatch() {
        return this._def.innerType;
      }
    };
    ZodCatch.create = (type, params) => {
      return new ZodCatch({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodCatch,
        catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
        ...processCreateParams(params)
      });
    };
    ZodNaN = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.nan) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.nan,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return { status: "valid", value: input.data };
      }
    };
    ZodNaN.create = (params) => {
      return new ZodNaN({
        typeName: ZodFirstPartyTypeKind.ZodNaN,
        ...processCreateParams(params)
      });
    };
    BRAND = /* @__PURE__ */ Symbol("zod_brand");
    ZodBranded = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const data = ctx.data;
        return this._def.type._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      unwrap() {
        return this._def.type;
      }
    };
    ZodPipeline = class _ZodPipeline extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.common.async) {
          const handleAsync = async () => {
            const inResult = await this._def.in._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inResult.status === "aborted")
              return INVALID;
            if (inResult.status === "dirty") {
              status.dirty();
              return DIRTY(inResult.value);
            } else {
              return this._def.out._parseAsync({
                data: inResult.value,
                path: ctx.path,
                parent: ctx
              });
            }
          };
          return handleAsync();
        } else {
          const inResult = this._def.in._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return {
              status: "dirty",
              value: inResult.value
            };
          } else {
            return this._def.out._parseSync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        }
      }
      static create(a, b) {
        return new _ZodPipeline({
          in: a,
          out: b,
          typeName: ZodFirstPartyTypeKind.ZodPipeline
        });
      }
    };
    ZodReadonly = class extends ZodType {
      _parse(input) {
        const result = this._def.innerType._parse(input);
        const freeze = (data) => {
          if (isValid(data)) {
            data.value = Object.freeze(data.value);
          }
          return data;
        };
        return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    ZodReadonly.create = (type, params) => {
      return new ZodReadonly({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodReadonly,
        ...processCreateParams(params)
      });
    };
    late = {
      object: ZodObject.lazycreate
    };
    (function(ZodFirstPartyTypeKind2) {
      ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
      ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
      ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
      ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
      ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
      ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
      ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
      ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
      ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
      ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
      ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
      ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
      ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
      ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
      ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
      ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
      ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
      ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
      ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
      ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
      ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
      ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
      ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
      ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
      ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
      ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
      ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
      ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
      ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
      ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
      ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
      ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
      ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
      ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
      ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
      ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
    })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
    instanceOfType = (cls, params = {
      message: `Input not instance of ${cls.name}`
    }) => custom((data) => data instanceof cls, params);
    stringType = ZodString.create;
    numberType = ZodNumber.create;
    nanType = ZodNaN.create;
    bigIntType = ZodBigInt.create;
    booleanType = ZodBoolean.create;
    dateType = ZodDate.create;
    symbolType = ZodSymbol.create;
    undefinedType = ZodUndefined.create;
    nullType = ZodNull.create;
    anyType = ZodAny.create;
    unknownType = ZodUnknown.create;
    neverType = ZodNever.create;
    voidType = ZodVoid.create;
    arrayType = ZodArray.create;
    objectType = ZodObject.create;
    strictObjectType = ZodObject.strictCreate;
    unionType = ZodUnion.create;
    discriminatedUnionType = ZodDiscriminatedUnion.create;
    intersectionType = ZodIntersection.create;
    tupleType = ZodTuple.create;
    recordType = ZodRecord.create;
    mapType = ZodMap.create;
    setType = ZodSet.create;
    functionType = ZodFunction.create;
    lazyType = ZodLazy.create;
    literalType = ZodLiteral.create;
    enumType = ZodEnum.create;
    nativeEnumType = ZodNativeEnum.create;
    promiseType = ZodPromise.create;
    effectsType = ZodEffects.create;
    optionalType = ZodOptional.create;
    nullableType = ZodNullable.create;
    preprocessType = ZodEffects.createWithPreprocess;
    pipelineType = ZodPipeline.create;
    ostring = () => stringType().optional();
    onumber = () => numberType().optional();
    oboolean = () => booleanType().optional();
    coerce = {
      string: ((arg) => ZodString.create({ ...arg, coerce: true })),
      number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
      boolean: ((arg) => ZodBoolean.create({
        ...arg,
        coerce: true
      })),
      bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
      date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
    };
    NEVER = INVALID;
  }
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});
var init_external = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js"() {
    init_errors();
    init_parseUtil();
    init_typeAliases();
    init_util();
    init_types();
    init_ZodError();
  }
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/index.js
var init_zod = __esm({
  "node_modules/.pnpm/zod@3.25.76/node_modules/zod/index.js"() {
    init_external();
    init_external();
  }
});

// packages/context/src/schema.ts
function isEnvReference(value) {
  return value.trim() === "" || /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$/.test(value.trim());
}
function literalEnvKeys(env2) {
  return Object.entries(env2).filter(([, value]) => !isEnvReference(value)).map(([key]) => key);
}
var TARGETS, slug, toolList, ProvenanceSchema, PROVENANCE_PREFIX, targetFilter, RepoQuerySchema, InstructionsSchema, RuleSchema, SkillSchema, AgentSchema, CommandSchema, McpServerSchema, ContextModelSchema, ConfigSchema;
var init_schema = __esm({
  "packages/context/src/schema.ts"() {
    "use strict";
    init_zod();
    TARGETS = ["claude", "copilot", "cursor", "codex"];
    slug = external_exports.string().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case (a-z, 0-9, hyphens)");
    toolList = external_exports.preprocess(
      (v) => typeof v === "string" ? v.split(",").map((t) => t.trim()).filter(Boolean) : v,
      external_exports.array(external_exports.string())
    ).optional();
    ProvenanceSchema = external_exports.record(external_exports.string()).optional();
    PROVENANCE_PREFIX = "x-ctxmux-";
    targetFilter = external_exports.array(external_exports.enum(TARGETS)).nonempty().optional();
    RepoQuerySchema = external_exports.object({
      /** Symbol name patterns; `*` wildcards allowed (e.g. "use*", "*Selector"). */
      symbols: external_exports.array(external_exports.string()).optional(),
      /** Restrict the search to these path globs. */
      paths: external_exports.array(external_exports.string()).optional(),
      /** Free-text terms ranked lexically against symbol names, paths and doc comments. */
      terms: external_exports.array(external_exports.string()).optional(),
      /** Hard token ceiling for the resolved slice. Required by design — see PLAN §5.2. */
      budget: external_exports.number().int().positive().max(5e4).default(1500)
    }).strict();
    InstructionsSchema = external_exports.object({
      body: external_exports.string(),
      targets: targetFilter
    }).strict();
    RuleSchema = external_exports.object({
      name: slug,
      description: external_exports.string().min(1).max(500).optional(),
      /** Glob patterns this rule applies to. Empty means repo-wide. */
      globs: external_exports.array(external_exports.string()).default([]),
      /** Force inclusion regardless of globs. */
      alwaysApply: external_exports.boolean().default(false),
      /** Higher wins when targets impose an ordering or a size ceiling. */
      priority: external_exports.number().int().min(0).max(100).default(50),
      targets: targetFilter,
      provenance: ProvenanceSchema,
      body: external_exports.string()
    }).strict();
    SkillSchema = external_exports.object({
      name: slug,
      /** Drives activation. The single most important field — targets match against it. */
      description: external_exports.string().min(1).max(1024),
      globs: external_exports.array(external_exports.string()).default([]),
      /** Optional slice of the repository to pull in when this skill activates. */
      repoQuery: RepoQuerySchema.optional(),
      /** Files bundled alongside SKILL.md, relative to the skill directory. */
      resources: external_exports.array(external_exports.string()).default([]),
      /** Tools this skill expects to be available; advisory for targets that can enforce it. */
      tools: toolList,
      targets: targetFilter,
      provenance: ProvenanceSchema,
      body: external_exports.string()
    }).strict();
    AgentSchema = external_exports.object({
      name: slug,
      description: external_exports.string().min(1).max(1024),
      /** Allowed tool names. Absent means "inherit whatever the host allows". */
      tools: toolList,
      model: external_exports.string().optional(),
      /** Which execution archetype this role is written for. See PLAN §3.1. */
      archetype: external_exports.enum(["delegated", "driven", "any"]).default("any"),
      targets: targetFilter,
      body: external_exports.string()
    }).strict();
    CommandSchema = external_exports.object({
      name: slug,
      description: external_exports.string().min(1).max(500),
      /** Named arguments interpolated into the body as {name}. */
      args: external_exports.array(external_exports.string()).default([]),
      targets: targetFilter,
      body: external_exports.string()
    }).strict();
    McpServerSchema = external_exports.object({
      name: slug,
      transport: external_exports.enum(["stdio", "http", "sse"]).default("stdio"),
      command: external_exports.string().optional(),
      args: external_exports.array(external_exports.string()).default([]),
      url: external_exports.string().url().optional(),
      /**
       * Environment for the server, as *references* rather than values.
       *
       * `{ "GITHUB_TOKEN": "${GITHUB_TOKEN}" }`, never the token itself. This file is compiled
       * out to `.mcp.json`, `.cursor/mcp.json`, a Codex TOML fragment and a Copilot
       * configuration document — so a literal here does not stay in one place, it becomes five,
       * one of which exists specifically to be reviewed in version control.
       *
       * Not rejected by the schema, because a repository that already has one should still load
       * rather than break. `isEnvReference` is what the loader, the importer and `doctor` use to
       * make it loud instead.
       */
      env: external_exports.record(external_exports.string()).default({}),
      /**
       * Read-only servers are safe to expose to agents processing untrusted ticket text.
       * Defaults to true: opting *in* to write access should be a deliberate act.
       */
      readOnly: external_exports.boolean().default(true),
      targets: targetFilter
    }).strict().refine((s) => s.transport === "stdio" ? !!s.command : !!s.url, {
      message: "stdio servers need `command`; http/sse servers need `url`"
    });
    ContextModelSchema = external_exports.object({
      instructions: InstructionsSchema.optional(),
      rules: external_exports.array(RuleSchema).default([]),
      skills: external_exports.array(SkillSchema).default([]),
      agents: external_exports.array(AgentSchema).default([]),
      commands: external_exports.array(CommandSchema).default([]),
      mcp: external_exports.array(McpServerSchema).default([])
    }).strict();
    ConfigSchema = external_exports.object({
      /** Which targets `sync` writes. */
      targets: external_exports.array(external_exports.enum(TARGETS)).nonempty().default(["claude", "copilot", "cursor", "codex"]),
      /**
       * Which agent and tracker this repository normally uses.
       *
       * A team that always runs Copilot against Jira should not have to remember two flags on
       * every invocation, or keep them in one person's shell profile where nobody else can see
       * them. Both stay overridable — a one-off `--agent claude` still wins — but the repository's
       * normal choice belongs in the repository, where it can be reviewed in a diff.
       */
      agent: external_exports.string().optional(),
      tracker: external_exports.string().optional(),
      /** Directory holding the canonical model, relative to the repo root. */
      sourceDir: external_exports.string().default(".ctxmux"),
      /** Emit provenance headers on generated files. Disabling makes drift undetectable. */
      provenance: external_exports.boolean().default(true)
    }).strict();
  }
});

// packages/context/src/errors.ts
function formatDiagnostics(diags) {
  return diags.map((d) => {
    const where = d.file ? `${d.file}: ` : "";
    const icon = d.level === "error" ? "error" : "warning";
    const hint = d.hint ? `
         ${d.hint}` : "";
    return `  ${icon}  ${where}${d.message}${hint}`;
  }).join("\n");
}
var ContextError;
var init_errors2 = __esm({
  "packages/context/src/errors.ts"() {
    "use strict";
    ContextError = class extends Error {
      name = "ContextError";
      diagnostics;
      /** The headline without the diagnostic detail, for callers that render them separately. */
      summary;
      constructor(message, diagnostics = []) {
        super(diagnostics.length > 0 ? `${message}
${formatDiagnostics(diagnostics)}` : message);
        this.summary = message;
        this.diagnostics = diagnostics;
      }
    };
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar;
    exports.isSeq = isSeq;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path26) {
      const ctrl = callVisitor(key, node, visitor, path26);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path26, ctrl);
        return visit_(key, ctrl, visitor, path26);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path26 = Object.freeze(path26.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path26);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path26 = Object.freeze(path26.concat(node));
          const ck = visit_("key", node.key, visitor, path26);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path26);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path26) {
      const ctrl = await callVisitor(key, node, visitor, path26);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path26, ctrl);
        return visitAsync_(key, ctrl, visitor, path26);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path26 = Object.freeze(path26.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path26);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path26 = Object.freeze(path26.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path26);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path26);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path26) {
      if (typeof visitor === "function")
        return visitor(key, node, path26);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path26);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path26);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path26);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path26);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path26);
      return void 0;
    }
    function replaceNode(key, path26, node) {
      const parent = path26[path26.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid2 = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid2);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error2) {
            onError(String(error2));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error2 = new Error("Failed to resolve repeated object (this should not happen)");
              error2.source = source;
              throw error2;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports.toJS = toJS;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const { anchors: anchors2, doc, maxAliasCount } = ctx;
        const source = this.resolve(doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        let data = anchors2.get(source);
        if (!data) {
          toJS.toJS(source, null, ctx);
          data = anchors2.get(source);
        }
        if (data?.res === void 0) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, source, anchors2);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
        return data.res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c2 = getAliasCount(doc, item, anchors2);
          if (c2 > count)
            count = c2;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path26, value) {
      let v = value;
      for (let i = path26.length - 1; i >= 0; --i) {
        const k = path26[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path26) => path26 == null || typeof path26 === "object" && !!path26[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path26, value) {
        if (isEmptyPath(path26))
          this.add(value);
        else {
          const [key, ...rest] = path26;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path26) {
        const [key, ...rest] = path26;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path26, keepScalar) {
        const [key, ...rest] = path26;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path26) {
        const [key, ...rest] = path26;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path26, value) {
        const [key, ...rest] = path26;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header2 = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header2 += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header2}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header2}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options2) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options2);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn2(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn2;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options2) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options2);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports.map = map;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options2) {
      const lines = [];
      let hasDirectives = options2.directives === true;
      if (options2.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify.createStringifyContext(doc, options2);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options2) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options2 === void 0 && replacer) {
          options2 = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options2);
        this.options = opt;
        let { version } = opt;
        if (options2?._directives) {
          this.directives = options2._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options2);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options2);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path26, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path26, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options2) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options2 === void 0 && replacer) {
          options2 = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options2 ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options2 = {}) {
        const k = this.createNode(key, null, options2);
        const v = this.createNode(value, null, options2);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path26) {
        if (Collection.isEmptyPath(path26)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path26) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path26, keepScalar) {
        if (Collection.isEmptyPath(path26))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path26, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path26) {
        if (Collection.isEmptyPath(path26))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path26) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path26, value) {
        if (Collection.isEmptyPath(path26)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path26), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path26, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options2 = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options2.schema instanceof Object)
          this.schema = options2.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options2));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options2 = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options2 && (!Number.isInteger(options2.indent) || Number(options2.indent) <= 0)) {
          const s = JSON.stringify(options2.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options2);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error2) => {
      if (error2.pos[0] === -1)
        return;
      error2.linePos = error2.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error2.linePos[0];
      error2.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error2.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error2.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep: sep3, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep3?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep3) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep3 ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep3, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep3 = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep3 + cb;
              sep3 = "";
              break;
            }
            case "newline":
              if (comment)
                sep3 += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep: sep3, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep3?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep3 && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep3 && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep3, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep3 ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep3)
                for (const st of sep3) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep3, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header2 = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header2)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header2.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header2.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header2.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header2.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header2.indent;
      let offset = scalar.offset + header2.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header2.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header2.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep3 = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header2.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep3 + indent.slice(trimIndent) + content;
          sep3 = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep3 === " ")
            sep3 = "\n";
          else if (!prevMoreIndented && sep3 === "\n")
            sep3 = "\n\n";
          value += sep3 + indent.slice(trimIndent) + content;
          sep3 = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep3 === "\n")
            value += "\n";
          else
            sep3 = "\n";
        } else {
          value += sep3 + content;
          sep3 = " ";
          prevMoreIndented = false;
        }
      }
      switch (header2.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header2.length + scalar.source.length;
      return { value, type, comment: header2.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error2 = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error2 === -1)
            error2 = offset + i;
        }
      }
      if (error2 !== -1)
        onError(error2, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return foldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return foldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function foldLines(source) {
      let first, line;
      try {
        first = new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
        line = new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
      } catch {
        first = /(.*?)[ \t]*\r?\n/sy;
        line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
      }
      let match = first.exec(source);
      if (!match)
        return source;
      let res = match[1];
      let sep3 = " ";
      let pos = first.lastIndex;
      line.lastIndex = pos;
      while (match = line.exec(source)) {
        if (match[1] === "") {
          if (sep3 === "\n")
            res += sep3;
          else
            sep3 = "\n";
        } else {
          res += sep3 + match[1];
          sep3 = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep3 + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error2) {
        const msg = error2 instanceof Error ? error2.message : String(error2);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error2) {
            const message = error2 instanceof Error ? error2.message : String(error2);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options: options2 }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options2.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options2, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options2);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options2 = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options2.version || "1.2" });
        this.options = options2;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error2 = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error2);
            else
              this.doc.errors.push(error2);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header2 = token.props[0];
            if (header2.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header2.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header2 = token.props[0];
        if (header2.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header2.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep: sep3, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep3)
        for (const st of sep3)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports.stringify = stringify;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path26) => {
      let item = cst;
      for (const [field, index] of path26) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path26) => {
      const parent = visit.itemAtPath(cst, path26.slice(0, -1));
      const field = path26[path26.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path26, item, visitor) {
      let ctrl = visitor(item, path26);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path26.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path26);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path26) : ctrl;
    }
    exports.visit = visit;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list2, type) {
      for (let i = 0; i < list2.length; ++i)
        if (list2[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list2) {
      for (let i = 0; i < list2.length; ++i) {
        switch (list2[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error2) {
        const token = error2 ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep3;
          if (scalar.end) {
            sep3 = scalar.end;
            sep3.push(this.sourceToken);
            delete scalar.end;
          } else
            sep3 = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep: sep3 }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep3 = it.sep;
                  sep3.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep: sep3 }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs24 = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs24, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs24);
              } else {
                Object.assign(it, { key: fs24, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs24 = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs24, sep: [] });
              else if (it.sep)
                this.stack.push(fs24);
              else
                Object.assign(it, { key: fs24, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep3 = fc.end.splice(1, fc.end.length);
            sep3.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep: sep3 }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options2) {
      const prettyErrors = options2.prettyErrors !== false;
      const lineCounter$1 = options2.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options2 = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options2);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options2);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options2 = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options2);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options2);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse(src, reviver, options2) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options2 === void 0 && reviver && typeof reviver === "object") {
        options2 = reviver;
      }
      const doc = parseDocument(src, options2);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options2));
    }
    function stringify(value, replacer, options2) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options2 === void 0 && replacer) {
        options2 = replacer;
      }
      if (typeof options2 === "string")
        options2 = options2.length;
      if (typeof options2 === "number") {
        const indent = Math.round(options2);
        options2 = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options2 ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options2);
      return new Document.Document(value, _replacer, options2).toString(options2);
    }
    exports.parse = parse;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify;
  }
});

// node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/yaml@2.9.0/node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit.visit;
    exports.visitAsync = visit.visitAsync;
  }
});

// packages/context/src/frontmatter.ts
function parseFrontmatter(raw, filename = "<input>") {
  const text = raw.replace(/^﻿/, "");
  if (!OPEN.test(text)) return { data: {}, body: text.trim(), had: false };
  const afterOpen = text.replace(OPEN, "");
  const close = CLOSE.exec(afterOpen);
  if (!close) {
    throw new ContextParseError(
      `${filename}: frontmatter opened with "---" but never closed. Add a closing "---" line.`
    );
  }
  const yamlSrc = afterOpen.slice(0, close.index);
  const body = afterOpen.slice(close.index + close[0].length);
  let data;
  try {
    data = (0, import_yaml.parse)(yamlSrc) ?? {};
  } catch (err) {
    throw new ContextParseError(
      `${filename}: frontmatter is not valid YAML \u2014 ${err.message}`
    );
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new ContextParseError(`${filename}: frontmatter must be a YAML mapping.`);
  }
  return { data, body: body.trim(), had: true };
}
function serializeFrontmatter(data, body) {
  const clean2 = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== void 0 && v !== null)
  );
  if (Object.keys(clean2).length === 0) return `${body.trim()}
`;
  const yaml = (0, import_yaml.stringify)(clean2, { lineWidth: 0 }).trimEnd();
  return `---
${yaml}
---

${body.trim()}
`;
}
var import_yaml, OPEN, CLOSE, ContextParseError;
var init_frontmatter = __esm({
  "packages/context/src/frontmatter.ts"() {
    "use strict";
    import_yaml = __toESM(require_dist(), 1);
    OPEN = /^---\r?\n/;
    CLOSE = /\r?\n---[ \t]*(?:\r?\n|$)/;
    ContextParseError = class extends Error {
      name = "ContextParseError";
    };
  }
});

// packages/context/src/loader.ts
import { promises as fs } from "node:fs";
import * as path from "node:path";
function splitProvenance(data) {
  const fields = {};
  const provenance = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith(PROVENANCE_PREFIX)) {
      provenance[key.slice(PROVENANCE_PREFIX.length)] = String(value);
    } else {
      fields[key] = value;
    }
  }
  return Object.keys(provenance).length > 0 ? { fields, provenance } : { fields };
}
async function readIfExists(p) {
  try {
    return await fs.readFile(p, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}
async function listFiles(dir, ext = ".md") {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(ext) && !e.name.startsWith(".")).map((e) => path.join(dir, e.name)).sort();
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
async function listDirs(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => path.join(dir, e.name)).sort();
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
function zodDiagnostics(err, file) {
  return err.issues.map((issue) => ({
    level: "error",
    file,
    message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    hint: issue.code === "unrecognized_keys" ? "Unknown frontmatter keys are rejected so typos surface immediately." : void 0
  }));
}
async function loadConfig(root, sourceDir = ".ctxmux") {
  const dir = path.resolve(root, sourceDir);
  const jsonRaw = await readIfExists(path.join(dir, "config.json"));
  if (jsonRaw) {
    let parsed;
    try {
      parsed = JSON.parse(jsonRaw);
    } catch (err) {
      throw new ContextError("Invalid config.json", [
        {
          level: "error",
          file: path.join(sourceDir, "config.json"),
          message: err.message
        }
      ]);
    }
    const result = ConfigSchema.safeParse(parsed);
    if (!result.success) {
      throw new ContextError(
        "Invalid config.json",
        zodDiagnostics(result.error, path.join(sourceDir, "config.json"))
      );
    }
    return { ...result.data, sourceDir };
  }
  return { ...ConfigSchema.parse({}), sourceDir };
}
async function loadContext(opts = {}) {
  const root = path.resolve(opts.root ?? process.cwd());
  const config = await loadConfig(root, opts.sourceDir ?? ".ctxmux");
  const dir = path.resolve(root, config.sourceDir);
  const sources = [];
  const diagnostics = [];
  const rel = (p) => path.relative(root, p);
  try {
    await fs.access(dir);
  } catch {
    throw new ContextError(`No context directory at ${config.sourceDir}/`, [
      {
        level: "error",
        message: `${config.sourceDir}/ does not exist.`,
        hint: "Run `ctxmux init` to scaffold one, or `ctxmux import` to build it from existing agent config files."
      }
    ]);
  }
  let instructions2;
  const instrPath = path.join(dir, "instructions.md");
  const instrRaw = await readIfExists(instrPath);
  if (instrRaw !== null) {
    sources.push(instrPath);
    const { data, body } = parseFrontmatter(instrRaw, rel(instrPath));
    const result = InstructionsSchema.safeParse({ ...data, body });
    if (result.success) instructions2 = result.data;
    else diagnostics.push(...zodDiagnostics(result.error, rel(instrPath)));
  }
  const rules = [];
  for (const file of await listFiles(path.join(dir, "rules"))) {
    sources.push(file);
    const raw = await fs.readFile(file, "utf8");
    const { data, body } = parseFrontmatter(raw, rel(file));
    const fallbackName = path.basename(file, ".md");
    const { fields, provenance } = splitProvenance(data);
    const result = RuleSchema.safeParse({
      name: fallbackName,
      ...fields,
      ...provenance ? { provenance } : {},
      body
    });
    if (result.success) rules.push(result.data);
    else diagnostics.push(...zodDiagnostics(result.error, rel(file)));
  }
  const skills = [];
  for (const skillDir of await listDirs(path.join(dir, "skills"))) {
    const file = path.join(skillDir, "SKILL.md");
    const raw = await readIfExists(file);
    if (raw === null) {
      diagnostics.push({
        level: "warning",
        file: rel(skillDir),
        message: "skill directory has no SKILL.md \u2014 ignored",
        hint: `Create ${path.join(rel(skillDir), "SKILL.md")} or remove the directory.`
      });
      continue;
    }
    sources.push(file);
    const { data, body } = parseFrontmatter(raw, rel(file));
    const fallbackName = path.basename(skillDir);
    const discovered = [];
    for (const sub of ["references", "scripts", "assets"]) {
      for (const f of await listFiles(path.join(skillDir, sub), "")) {
        discovered.push(path.relative(skillDir, f));
      }
    }
    const { fields, provenance } = splitProvenance(data);
    const result = SkillSchema.safeParse({
      name: fallbackName,
      ...fields,
      ...provenance ? { provenance } : {},
      resources: discovered.sort(),
      body
    });
    if (result.success) skills.push(result.data);
    else diagnostics.push(...zodDiagnostics(result.error, rel(file)));
  }
  const agents = [];
  for (const file of await listFiles(path.join(dir, "agents"))) {
    sources.push(file);
    const raw = await fs.readFile(file, "utf8");
    const { data, body } = parseFrontmatter(raw, rel(file));
    const fallbackName = path.basename(file, ".md").replace(/\.agent$/, "");
    const result = AgentSchema.safeParse({ name: fallbackName, ...data, body });
    if (result.success) agents.push(result.data);
    else diagnostics.push(...zodDiagnostics(result.error, rel(file)));
  }
  const commands = [];
  for (const file of await listFiles(path.join(dir, "commands"))) {
    sources.push(file);
    const raw = await fs.readFile(file, "utf8");
    const { data, body } = parseFrontmatter(raw, rel(file));
    const fallbackName = path.basename(file, ".md");
    const result = CommandSchema.safeParse({ name: fallbackName, ...data, body });
    if (result.success) commands.push(result.data);
    else diagnostics.push(...zodDiagnostics(result.error, rel(file)));
  }
  const mcp = [];
  const mcpPath = path.join(dir, "mcp.json");
  const mcpRaw = await readIfExists(mcpPath);
  if (mcpRaw !== null) {
    sources.push(mcpPath);
    let parsed;
    try {
      parsed = JSON.parse(mcpRaw);
    } catch (err) {
      diagnostics.push({ level: "error", file: rel(mcpPath), message: err.message });
      parsed = null;
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed;
      const servers = record["servers"] ?? record["mcpServers"] ?? record;
      for (const [name, value] of Object.entries(servers)) {
        if (!value || typeof value !== "object") continue;
        const result = McpServerSchema.safeParse({ name, ...value });
        if (!result.success) {
          diagnostics.push(...zodDiagnostics(result.error, rel(mcpPath)));
          continue;
        }
        mcp.push(result.data);
        const literals = literalEnvKeys(result.data.env);
        if (literals.length > 0) {
          diagnostics.push({
            level: "warning",
            file: rel(mcpPath),
            message: `mcp server "${name}" has literal env value(s) for ${literals.join(", ")}`,
            hint: `Use a reference instead \u2014 "${literals[0]}": "\${${literals[0]}}" \u2014 so the value stays out of every generated file.`
          });
        }
      }
    }
  }
  for (const [kind, items] of Object.entries({ rules, skills, agents, commands })) {
    const seen = /* @__PURE__ */ new Map();
    for (const item of items) {
      seen.set(item.name, (seen.get(item.name) ?? 0) + 1);
    }
    for (const [name, count] of seen) {
      if (count > 1) {
        diagnostics.push({
          level: "error",
          message: `duplicate ${kind.slice(0, -1)} name "${name}" (${count} definitions)`,
          hint: "Names become filenames in compiled output, so they must be unique."
        });
      }
    }
  }
  const errors = diagnostics.filter((d) => d.level === "error");
  if (errors.length > 0) {
    throw new ContextError(`${errors.length} problem(s) in ${config.sourceDir}/`, diagnostics);
  }
  const model = ContextModelSchema.parse({
    instructions: instructions2,
    rules,
    skills,
    agents,
    commands,
    mcp
  });
  return { model, config, root, sources, warnings: diagnostics.filter((d) => d.level === "warning") };
}
var init_loader = __esm({
  "packages/context/src/loader.ts"() {
    "use strict";
    init_frontmatter();
    init_errors2();
    init_schema();
  }
});

// packages/context/src/fsx.ts
import { promises as fs2 } from "node:fs";
import * as path2 from "node:path";
async function writeFileAtomic(file, content) {
  const dir = path2.dirname(file);
  await fs2.mkdir(dir, { recursive: true });
  const tmp = path2.join(dir, `.${path2.basename(file)}.ctxmux-${process.pid}-${sequence++}.tmp`);
  try {
    await fs2.writeFile(tmp, content, "utf8");
    await fs2.rename(tmp, file);
  } catch (err) {
    await fs2.rm(tmp, { force: true }).catch(() => {
    });
    throw err;
  }
}
var sequence;
var init_fsx = __esm({
  "packages/context/src/fsx.ts"() {
    "use strict";
    sequence = 0;
  }
});

// packages/context/src/writer.ts
import { createHash } from "node:crypto";
import { promises as fs3 } from "node:fs";
import * as path3 from "node:path";
function hashContent(s) {
  return createHash("sha256").update(normalizeForHash(s)).digest("hex").slice(0, 12);
}
function normalizeForHash(s) {
  return s.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function stripProvenance(s) {
  return s.replace(/^[^\n]*ctxmux:hash=[0-9a-f]{12}[^\n]*\n?/m, "");
}
function commentSyntax(filePath) {
  const ext = path3.extname(filePath);
  if (ext === ".json") return null;
  if (ext === ".toml" || ext === ".yaml" || ext === ".yml") return { open: "#", close: "" };
  return { open: "<!--", close: "-->" };
}
function provenanceHeader(filePath, hash) {
  const c2 = commentSyntax(filePath);
  if (!c2) return null;
  const text = `Generated by contextmux from .ctxmux/ \u2014 do not edit by hand. ctxmux:hash=${hash}`;
  return c2.close ? `${c2.open} ${text} ${c2.close}` : `${c2.open} ${text}`;
}
function blockMarkers(filePath) {
  const c2 = commentSyntax(filePath) ?? { open: "<!--", close: "-->" };
  const wrap2 = (t) => c2.close ? `${c2.open} ${t} ${c2.close}` : `${c2.open} ${t}`;
  return { begin: wrap2(BEGIN), end: wrap2(END) };
}
function findMarker(text, tag, filePath) {
  const idx = text.indexOf(tag);
  if (idx === -1) return null;
  const c2 = commentSyntax(filePath) ?? { open: "<!--", close: "-->" };
  if (c2.close) {
    const start = text.lastIndexOf(c2.open, idx);
    if (start === -1) return null;
    const closeAt = text.indexOf(c2.close, idx);
    if (closeAt === -1) return null;
    return { start, end: closeAt + c2.close.length };
  }
  const lineStart = text.lastIndexOf("\n", idx) + 1;
  const lineEnd = text.indexOf("\n", idx);
  return { start: lineStart, end: lineEnd === -1 ? text.length : lineEnd };
}
function splitManaged(existing, filePath) {
  const begin = findMarker(existing, BEGIN, filePath);
  const end = findMarker(existing, END, filePath);
  if (!begin || !end || end.start < begin.end) {
    return { before: existing, managed: null, after: "" };
  }
  return {
    before: existing.slice(0, begin.start),
    managed: existing.slice(begin.end, end.start),
    after: existing.slice(end.end)
  };
}
function renderFull(file, provenance) {
  if (!provenance || file.noProvenance) return file.content;
  const header2 = provenanceHeader(file.path, hashContent(file.content));
  if (!header2) return file.content;
  const fmEnd = frontmatterEnd(file.content);
  if (fmEnd === null) return `${header2}

${file.content}`;
  return `${file.content.slice(0, fmEnd)}
${header2}
${file.content.slice(fmEnd)}`;
}
function frontmatterEnd(content) {
  if (!content.startsWith("---\n")) return null;
  const close = content.indexOf("\n---", 3);
  if (close === -1) return null;
  const lineEnd = content.indexOf("\n", close + 1);
  return lineEnd === -1 ? content.length : lineEnd + 1;
}
function renderBlock(file, existing, provenance) {
  const { end } = blockMarkers(file.path);
  const hash = hashContent(file.content);
  const note = provenance ? ` ctxmux:hash=${hash}` : "";
  const c2 = commentSyntax(file.path) ?? { open: "<!--", close: "-->" };
  const beginWithHash = c2.close ? `${c2.open} ${BEGIN}${note} \u2014 generated by contextmux, do not edit inside this block ${c2.close}` : `${c2.open} ${BEGIN}${note} \u2014 generated by contextmux, do not edit inside this block`;
  const managedBody = `

${file.content.trim()}

`;
  if (existing === null) {
    return `${beginWithHash}${managedBody}${end}
`;
  }
  const parts = splitManaged(existing, file.path);
  if (parts.managed === null) {
    if (sameBody(existing, file.content)) {
      return `${beginWithHash}${managedBody}${end}
`;
    }
    return `${beginWithHash}${managedBody}${end}

${existing.trimStart()}`;
  }
  return `${parts.before}${beginWithHash}${managedBody}${end}${parts.after}`;
}
function sameBody(a, b) {
  const lines = (text) => text.split("\n").map((line) => line.trimEnd()).filter((line) => line.length > 0).join("\n");
  return lines(a) === lines(b);
}
function detectDrift(existing, filePath, ownership) {
  const m = HASH_RE.exec(existing);
  if (!m) return null;
  const recorded = m[1];
  if (ownership === "block") {
    const { managed } = splitManaged(existing, filePath);
    if (managed === null) return null;
    return hashContent(managed) !== recorded;
  }
  return hashContent(stripProvenance(existing)) !== recorded;
}
async function readIfExists2(p) {
  try {
    return await fs3.readFile(p, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}
function findCollisions(files) {
  const byPath = /* @__PURE__ */ new Map();
  for (const f of files) {
    const list2 = byPath.get(f.path) ?? [];
    list2.push(f.target);
    byPath.set(f.path, list2);
  }
  return [...byPath].filter(([, targets]) => targets.length > 1).map(([p, targets]) => `${p} (claimed by ${targets.join(", ")})`);
}
async function writeOutputs(files, opts) {
  const provenance = opts.provenance !== false;
  const records = [];
  const root = path3.resolve(opts.root);
  for (const file of files) {
    const abs = path3.resolve(root, file.path);
    if (abs !== root && !abs.startsWith(root + path3.sep)) {
      throw new Error(
        `refusing to write "${file.path}" \u2014 it resolves outside the repository (${abs}). A rule or skill glob is naming a location outside the project.`
      );
    }
    const existing = await readIfExists2(abs);
    const next = file.ownership === "block" ? renderBlock(file, existing, provenance) : renderFull(file, provenance);
    if (existing !== null && existing.trimEnd() === next.trimEnd()) {
      records.push({ path: file.path, status: "unchanged", target: file.target });
      continue;
    }
    if (existing !== null) {
      const drifted = detectDrift(existing, file.path, file.ownership) ?? (provenance && file.ownership === "full");
      if (drifted && !opts.force) {
        records.push({ path: file.path, status: "drift", target: file.target });
        continue;
      }
      if (drifted && opts.force) {
        if (!opts.dryRun) await writeFileAtomic(abs, next);
        records.push({ path: file.path, status: "forced", target: file.target });
        continue;
      }
    }
    if (!opts.dryRun) await writeFileAtomic(abs, next);
    records.push({
      path: file.path,
      status: existing === null ? "created" : "updated",
      target: file.target
    });
  }
  return records;
}
var BEGIN, END, HASH_RE;
var init_writer = __esm({
  "packages/context/src/writer.ts"() {
    "use strict";
    init_fsx();
    BEGIN = "ctxmux:begin";
    END = "ctxmux:end";
    HASH_RE = /ctxmux:hash=([0-9a-f]{12})/;
  }
});

// packages/context/src/fidelity.ts
function summarize(results, names) {
  return results.map((r) => ({
    target: r.target,
    displayName: names[r.target],
    fileCount: r.files.length,
    // Node types with nothing to compile are not interesting; suppress them.
    notes: r.fidelity.filter((n) => n.count > 0),
    degradedCount: r.fidelity.filter((n) => n.fidelity === "degraded" && n.count > 0).length,
    droppedCount: r.fidelity.filter((n) => n.fidelity === "dropped" && n.count > 0).length
  }));
}
function renderFidelityReport(summaries) {
  const out = [];
  for (const s of summaries) {
    const flag = s.droppedCount > 0 ? `${s.droppedCount} dropped, ${s.degradedCount} degraded` : s.degradedCount > 0 ? `${s.degradedCount} degraded` : "full fidelity";
    out.push(`${s.displayName}  \u2014  ${s.fileCount} file(s), ${flag}`);
    for (const n of s.notes) {
      const head = `  ${ICON[n.fidelity]} ${n.nodeType.padEnd(12)} ${String(n.count).padStart(3)}`;
      if (n.fidelity === "native") {
        out.push(`${head}  native`);
      } else {
        out.push(`${head}  \u2192 ${n.as ?? "unspecified"}`);
        if (n.lost) out.push(`${" ".repeat(20)}lost: ${n.lost}`);
      }
    }
    out.push("");
  }
  return out.join("\n").trimEnd();
}
function renderFidelityMarkdown(summaries) {
  const rows = [
    "| Target | Node type | Count | Fidelity | Represented as | Lost |",
    "| --- | --- | ---: | --- | --- | --- |"
  ];
  for (const s of summaries) {
    for (const n of s.notes) {
      rows.push(
        `| ${s.displayName} | ${n.nodeType} | ${n.count} | ${n.fidelity} | ${n.as ?? "\u2014"} | ${n.lost ?? "\u2014"} |`
      );
    }
  }
  return rows.join("\n") + "\n";
}
var ICON;
var init_fidelity = __esm({
  "packages/context/src/fidelity.ts"() {
    "use strict";
    ICON = {
      native: "\u2713",
      degraded: "~",
      dropped: "\u2717"
    };
  }
});

// packages/context/src/compilers/types.ts
function forTarget(items, target) {
  return items.filter((i) => !i.targets || i.targets.includes(target));
}
function narrow(model, target) {
  return {
    instructions: model.instructions && (!model.instructions.targets || model.instructions.targets.includes(target)) ? model.instructions : void 0,
    rules: forTarget(model.rules, target),
    skills: forTarget(model.skills, target),
    agents: forTarget(model.agents, target),
    commands: forTarget(model.commands, target),
    mcp: forTarget(model.mcp, target)
  };
}
function describeRepoQuery(q) {
  const parts = [];
  if (q.symbols?.length) parts.push(`symbols matching ${q.symbols.map((s) => `\`${s}\``).join(", ")}`);
  if (q.paths?.length) parts.push(`paths ${q.paths.map((s) => `\`${s}\``).join(", ")}`);
  if (q.terms?.length) parts.push(`terms ${q.terms.map((s) => `"${s}"`).join(", ")}`);
  if (parts.length === 0) return "";
  return `> **Before writing code, search the repository for existing implementations** \u2014 ${parts.join("; ")}. Reuse what exists instead of adding a parallel implementation. If the \`ctxmux-repo\` MCP server is available, call \`find_symbol\` or \`find_similar\`; otherwise grep for the patterns above.`;
}
var init_types2 = __esm({
  "packages/context/src/compilers/types.ts"() {
    "use strict";
  }
});

// packages/context/src/compilers/claude.ts
var claudeCompiler;
var init_claude = __esm({
  "packages/context/src/compilers/claude.ts"() {
    "use strict";
    init_frontmatter();
    init_types2();
    claudeCompiler = {
      target: "claude",
      displayName: "Claude Code",
      compile(ctx) {
        const m = narrow(ctx.model, "claude");
        const files = [];
        const fidelity = [];
        const sections2 = [];
        if (m.instructions) sections2.push(m.instructions.body.trim());
        const sorted = [...m.rules].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
        for (const rule of sorted) {
          const scope = rule.alwaysApply ? "Always applies." : rule.globs.length ? `Applies to: ${rule.globs.map((g) => `\`${g}\``).join(", ")}` : "Applies repo-wide.";
          sections2.push(
            [`## ${rule.description ?? rule.name}`, "", `_${scope}_`, "", rule.body.trim()].join("\n")
          );
        }
        if (sections2.length > 0) {
          files.push({
            path: "CLAUDE.md",
            content: sections2.join("\n\n") + "\n",
            ownership: "block"
          });
        }
        fidelity.push({
          nodeType: "instructions",
          fidelity: "native",
          count: m.instructions ? 1 : 0
        });
        fidelity.push({
          nodeType: "rules",
          fidelity: m.rules.some((r) => r.globs.length > 0) ? "degraded" : "native",
          count: m.rules.length,
          ...m.rules.some((r) => r.globs.length > 0) ? {
            as: "labelled sections in CLAUDE.md",
            lost: "path scoping is advisory \u2014 Claude Code loads CLAUDE.md in full rather than per-path"
          } : {}
        });
        for (const skill of m.skills) {
          const repoHint = skill.repoQuery ? describeRepoQuery(skill.repoQuery) : "";
          const body = [skill.body.trim(), repoHint].filter(Boolean).join("\n\n");
          files.push({
            path: `.claude/skills/${skill.name}/SKILL.md`,
            content: serializeFrontmatter(
              {
                name: skill.name,
                description: skill.description,
                ...skill.tools?.length ? { "allowed-tools": skill.tools } : {},
                // Third-party content stays attributed wherever it is compiled to. A reader of the
                // generated file should not have to trace it back to find out whose rules these are.
                ...skill.provenance?.["source"] ? { "x-source": skill.provenance["source"] } : {},
                ...skill.provenance?.["license"] ? { "x-license": skill.provenance["license"] } : {}
              },
              body
            ),
            ownership: "full"
          });
        }
        fidelity.push({ nodeType: "skills", fidelity: "native", count: m.skills.length });
        for (const agent of m.agents) {
          files.push({
            path: `.claude/agents/${agent.name}.md`,
            content: serializeFrontmatter(
              {
                name: agent.name,
                description: agent.description,
                ...agent.tools?.length ? { tools: agent.tools.join(", ") } : {},
                ...agent.model ? { model: agent.model } : {}
              },
              agent.body
            ),
            ownership: "full"
          });
        }
        fidelity.push({ nodeType: "agents", fidelity: "native", count: m.agents.length });
        for (const cmd of m.commands) {
          files.push({
            path: `.claude/commands/${cmd.name}.md`,
            content: serializeFrontmatter({ description: cmd.description }, cmd.body),
            ownership: "full"
          });
        }
        fidelity.push({ nodeType: "commands", fidelity: "native", count: m.commands.length });
        if (m.mcp.length > 0) {
          const servers = {};
          for (const s of m.mcp) {
            servers[s.name] = s.transport === "stdio" ? {
              command: s.command,
              ...s.args.length ? { args: s.args } : {},
              ...Object.keys(s.env).length ? { env: s.env } : {}
            } : { type: s.transport, url: s.url };
          }
          files.push({
            path: ".mcp.json",
            content: JSON.stringify({ mcpServers: servers }, null, 2) + "\n",
            ownership: "full",
            noProvenance: true
          });
        }
        fidelity.push({ nodeType: "mcp", fidelity: "native", count: m.mcp.length });
        return { target: "claude", files, fidelity };
      }
    };
  }
});

// packages/context/src/compilers/codex.ts
function commonDirectory(globs) {
  if (globs.length === 0) return null;
  const dirs = globs.map((g) => {
    const segs = g.split("/");
    const literal = [];
    for (const s of segs) {
      if (s.includes("*") || s.includes("?") || s.includes("{")) break;
      literal.push(s);
    }
    return literal.join("/");
  });
  if (dirs.some((d) => d === "")) return null;
  if (dirs.some((d) => !isInsideRepo(d))) return null;
  const first = dirs[0];
  return dirs.every((d) => d === first) ? first : null;
}
function isInsideRepo(dir) {
  if (dir.startsWith("/") || /^[A-Za-z]:/.test(dir)) return false;
  return !dir.split(/[/\\]/).includes("..");
}
var codexCompiler;
var init_codex = __esm({
  "packages/context/src/compilers/codex.ts"() {
    "use strict";
    init_types2();
    codexCompiler = {
      target: "codex",
      displayName: "Codex",
      compile(ctx) {
        const m = narrow(ctx.model, "codex");
        const files = [];
        const fidelity = [];
        const nested = /* @__PURE__ */ new Map();
        const rootRules = [];
        for (const rule of m.rules) {
          const dir = rule.alwaysApply ? null : commonDirectory(rule.globs);
          if (dir) {
            const list2 = nested.get(dir) ?? [];
            list2.push(rule);
            nested.set(dir, list2);
          } else {
            rootRules.push(rule);
          }
        }
        const sections2 = [];
        if (m.instructions) sections2.push(m.instructions.body.trim());
        for (const rule of rootRules.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))) {
          const scope = rule.globs.length ? `Applies to: ${rule.globs.map((g) => `\`${g}\``).join(", ")}` : "Applies repo-wide.";
          sections2.push([`## ${rule.description ?? rule.name}`, "", `_${scope}_`, "", rule.body.trim()].join("\n"));
        }
        for (const skill of m.skills) {
          const repoHint = skill.repoQuery ? describeRepoQuery(skill.repoQuery) : "";
          const scope = skill.globs.length ? `

_Relevant paths: ${skill.globs.map((g) => `\`${g}\``).join(", ")}_` : "";
          const credit = skill.provenance?.["source"] ? `

_From ${skill.provenance["source"]}${skill.provenance["license"] ? ` (${skill.provenance["license"]})` : ""}._` : "";
          sections2.push(
            [
              `## Skill: ${skill.name}`,
              "",
              `_Use this when: ${skill.description}_${scope}`,
              "",
              skill.body.trim(),
              ...repoHint ? ["", repoHint] : []
            ].join("\n") + credit
          );
        }
        for (const cmd of m.commands) {
          sections2.push([`## Command: ${cmd.name}`, "", `_${cmd.description}_`, "", cmd.body.trim()].join("\n"));
        }
        for (const agent of m.agents) {
          sections2.push(
            [`## Role: ${agent.name}`, "", `_${agent.description}_`, "", agent.body.trim()].join("\n")
          );
        }
        if (sections2.length > 0) {
          files.push({ path: "AGENTS.md", content: sections2.join("\n\n") + "\n", ownership: "block" });
        }
        for (const [dir, rules] of [...nested].sort(([a], [b]) => a.localeCompare(b))) {
          const body = rules.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name)).map((r) => [`## ${r.description ?? r.name}`, "", r.body.trim()].join("\n")).join("\n\n");
          files.push({
            path: `${dir}/AGENTS.md`,
            content: `${body}
`,
            ownership: "block"
          });
        }
        fidelity.push({ nodeType: "instructions", fidelity: "native", count: m.instructions ? 1 : 0 });
        fidelity.push({
          nodeType: "rules",
          fidelity: rootRules.some((r) => r.globs.length > 0) ? "degraded" : "native",
          count: m.rules.length,
          ...rootRules.some((r) => r.globs.length > 0) ? {
            as: `${nested.size} nested AGENTS.md file(s) for directory-scoped rules; ${rootRules.filter((r) => r.globs.length).length} cross-cutting rule(s) inlined in the root file`,
            lost: "cross-cutting globs (patterns not under a single directory) become advisory text"
          } : {}
        });
        if (m.skills.length > 0) {
          fidelity.push({
            nodeType: "skills",
            fidelity: "degraded",
            count: m.skills.length,
            as: "sections in AGENTS.md",
            lost: "no activation mechanism and no progressive disclosure \u2014 every skill body is always in context, which spends tokens on skills that are not relevant"
          });
        } else {
          fidelity.push({ nodeType: "skills", fidelity: "native", count: 0 });
        }
        if (m.agents.length > 0) {
          fidelity.push({
            nodeType: "agents",
            fidelity: "degraded",
            count: m.agents.length,
            as: "role sections in AGENTS.md",
            lost: "no subagent mechanism \u2014 roles cannot be dispatched to, and tool/model constraints are not enforced"
          });
        } else {
          fidelity.push({ nodeType: "agents", fidelity: "native", count: 0 });
        }
        fidelity.push({
          nodeType: "commands",
          fidelity: m.commands.length > 0 ? "degraded" : "native",
          count: m.commands.length,
          ...m.commands.length > 0 ? { as: "sections in AGENTS.md", lost: "commands cannot be invoked by name" } : {}
        });
        if (m.mcp.length > 0) {
          const toml = m.mcp.map((s) => {
            const lines = [`[mcp_servers.${s.name}]`];
            if (s.transport === "stdio") {
              lines.push(`command = ${JSON.stringify(s.command ?? "")}`);
              if (s.args.length) lines.push(`args = ${JSON.stringify(s.args)}`);
              if (Object.keys(s.env).length) {
                lines.push(
                  `env = { ${Object.entries(s.env).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join(", ")} }`
                );
              }
            } else {
              lines.push(`url = ${JSON.stringify(s.url ?? "")}`);
            }
            return lines.join("\n");
          }).join("\n\n");
          files.push({
            path: ".ctxmux/out/codex-config.toml",
            content: [
              "# Codex MCP configuration.",
              "# Codex reads MCP servers from ~/.codex/config.toml, which is user-level rather than",
              "# repository-level. Append the block below to that file \u2014 it cannot be applied from",
              "# inside the repository.",
              "",
              toml,
              ""
            ].join("\n"),
            ownership: "full"
          });
        }
        fidelity.push({
          nodeType: "mcp",
          fidelity: m.mcp.length > 0 ? "degraded" : "native",
          count: m.mcp.length,
          ...m.mcp.length > 0 ? {
            as: ".ctxmux/out/codex-config.toml (snippet)",
            lost: "Codex MCP config is user-level (~/.codex/config.toml) \u2014 the snippet must be appended manually"
          } : {}
        });
        return { target: "codex", files, fidelity };
      }
    };
  }
});

// packages/context/src/compilers/copilot.ts
var copilotCompiler;
var init_copilot = __esm({
  "packages/context/src/compilers/copilot.ts"() {
    "use strict";
    init_frontmatter();
    init_types2();
    copilotCompiler = {
      target: "copilot",
      displayName: "GitHub Copilot",
      compile(ctx) {
        const m = narrow(ctx.model, "copilot");
        const files = [];
        const fidelity = [];
        if (m.instructions) {
          files.push({
            path: ".github/copilot-instructions.md",
            content: m.instructions.body.trim() + "\n",
            ownership: "block"
          });
        }
        fidelity.push({ nodeType: "instructions", fidelity: "native", count: m.instructions ? 1 : 0 });
        for (const rule of m.rules) {
          const applyTo = rule.alwaysApply || rule.globs.length === 0 ? "**" : rule.globs.join(", ");
          files.push({
            path: `.github/instructions/${rule.name}.instructions.md`,
            content: serializeFrontmatter(
              { applyTo, ...rule.description ? { description: rule.description } : {} },
              rule.body
            ),
            ownership: "full"
          });
        }
        fidelity.push({ nodeType: "rules", fidelity: "native", count: m.rules.length });
        for (const skill of m.skills) {
          const repoHint = skill.repoQuery ? describeRepoQuery(skill.repoQuery) : "";
          const header2 = `_Use this when: ${skill.description}_` + (skill.globs.length ? `

_Relevant paths: ${skill.globs.map((g) => `\`${g}\``).join(", ")}_` : "");
          const body = [header2, skill.body.trim(), repoHint].filter(Boolean).join("\n\n");
          files.push({
            path: `.github/prompts/${skill.name}.prompt.md`,
            content: serializeFrontmatter(
              { mode: "agent", description: skill.description },
              body
            ),
            ownership: "full"
          });
        }
        if (m.skills.length > 0) {
          fidelity.push({
            nodeType: "skills",
            fidelity: "degraded",
            count: m.skills.length,
            as: ".github/prompts/*.prompt.md",
            lost: "automatic description-based activation \u2014 prompt files must be invoked explicitly by a human, and bundled resources are not loaded"
          });
        } else {
          fidelity.push({ nodeType: "skills", fidelity: "native", count: 0 });
        }
        for (const agent of m.agents) {
          files.push({
            path: `.github/agents/${agent.name}.agent.md`,
            content: serializeFrontmatter(
              { name: agent.name, description: agent.description },
              agent.body
            ),
            ownership: "full"
          });
        }
        if (m.agents.length > 0) {
          const constrained = m.agents.filter((a) => a.tools?.length || a.model);
          fidelity.push({
            nodeType: "agents",
            fidelity: constrained.length > 0 ? "degraded" : "native",
            count: m.agents.length,
            ...constrained.length > 0 ? {
              as: ".github/agents/*.agent.md",
              lost: "per-agent tool allowlists and model pinning are not expressed"
            } : {}
          });
        } else {
          fidelity.push({ nodeType: "agents", fidelity: "native", count: 0 });
        }
        for (const cmd of m.commands) {
          const argNote = cmd.args.length ? `

_Arguments: ${cmd.args.map((a) => `\`{${a}}\``).join(", ")} \u2014 replace before running._` : "";
          files.push({
            path: `.github/prompts/${cmd.name}.prompt.md`,
            content: serializeFrontmatter(
              { mode: "agent", description: cmd.description },
              cmd.body + argNote
            ),
            ownership: "full"
          });
        }
        fidelity.push({
          nodeType: "commands",
          fidelity: m.commands.some((c2) => c2.args.length > 0) ? "degraded" : "native",
          count: m.commands.length,
          ...m.commands.some((c2) => c2.args.length > 0) ? { as: ".github/prompts/*.prompt.md", lost: "named arguments are documented but not templated" } : {}
        });
        if (m.mcp.length > 0) {
          const servers = {};
          for (const s of m.mcp) {
            servers[s.name] = s.transport === "stdio" ? {
              type: "local",
              command: s.command,
              ...s.args.length ? { args: s.args } : {},
              ...Object.keys(s.env).length ? { env: s.env } : {},
              tools: ["*"]
            } : { type: s.transport, url: s.url, tools: ["*"] };
          }
          const secretNames = [
            ...new Set(
              m.mcp.flatMap((s) => Object.values(s.env).filter((v) => /^\$\{?[A-Z0-9_]+\}?$/.test(v)))
            )
          ];
          files.push({
            path: ".github/copilot-mcp-config.md",
            content: [
              "# Copilot coding agent \u2014 MCP configuration",
              "",
              "Copilot reads MCP configuration from **repository settings**, not from a file in the",
              "repository. This file is generated so the configuration is reviewable in version",
              "control, but it is not read by Copilot at runtime.",
              "",
              "**To apply:** Settings \u2192 Copilot \u2192 Coding agent \u2192 MCP configuration, and paste:",
              "",
              "```json",
              JSON.stringify({ mcpServers: servers }, null, 2),
              "```",
              "",
              ...secretNames.length ? [
                "Secrets referenced above must exist as Actions secrets named with the",
                "`COPILOT_MCP_` prefix, which is the only prefix the coding agent can read:",
                "",
                ...secretNames.map((n) => `- \`${n}\``),
                ""
              ] : [],
              ...m.mcp.some((s) => !s.readOnly) ? [
                "> **Warning:** one or more servers below are not marked read-only. An agent",
                "> processing untrusted issue or ticket text should not hold write-capable tools.",
                ""
              ] : []
            ].join("\n"),
            ownership: "full"
          });
        }
        fidelity.push({
          nodeType: "mcp",
          fidelity: m.mcp.length > 0 ? "degraded" : "native",
          count: m.mcp.length,
          ...m.mcp.length > 0 ? {
            as: ".github/copilot-mcp-config.md (documentation only)",
            lost: "Copilot reads MCP config from repository settings \u2014 the generated file must be pasted in manually"
          } : {}
        });
        return { target: "copilot", files, fidelity };
      }
    };
  }
});

// packages/context/src/compilers/cursor.ts
function mdc(meta, body) {
  return serializeFrontmatter(
    {
      ...meta.description ? { description: meta.description } : {},
      ...meta.globs?.length ? { globs: meta.globs.join(",") } : {},
      alwaysApply: meta.alwaysApply
    },
    body
  );
}
var cursorCompiler;
var init_cursor = __esm({
  "packages/context/src/compilers/cursor.ts"() {
    "use strict";
    init_frontmatter();
    init_types2();
    cursorCompiler = {
      target: "cursor",
      displayName: "Cursor",
      compile(ctx) {
        const m = narrow(ctx.model, "cursor");
        const files = [];
        const fidelity = [];
        if (m.instructions) {
          files.push({
            path: ".cursor/rules/000-project.mdc",
            content: mdc(
              { description: "Project-wide conventions", alwaysApply: true },
              m.instructions.body
            ),
            ownership: "full"
          });
        }
        fidelity.push({
          nodeType: "instructions",
          fidelity: m.instructions ? "degraded" : "native",
          count: m.instructions ? 1 : 0,
          ...m.instructions ? {
            as: ".cursor/rules/000-project.mdc with alwaysApply: true",
            lost: "nothing functionally \u2014 Cursor has no single root instruction file, so this is a naming difference only"
          } : {}
        });
        for (const rule of m.rules) {
          const prefix = String(100 - rule.priority).padStart(3, "0");
          files.push({
            path: `.cursor/rules/${prefix}-${rule.name}.mdc`,
            content: mdc(
              {
                description: rule.description ?? rule.name,
                globs: rule.globs,
                alwaysApply: rule.alwaysApply
              },
              rule.body
            ),
            ownership: "full"
          });
        }
        fidelity.push({ nodeType: "rules", fidelity: "native", count: m.rules.length });
        for (const skill of m.skills) {
          const repoHint = skill.repoQuery ? describeRepoQuery(skill.repoQuery) : "";
          const body = [skill.body.trim(), repoHint].filter(Boolean).join("\n\n");
          files.push({
            path: `.cursor/rules/skill-${skill.name}.mdc`,
            content: mdc(
              { description: skill.description, globs: skill.globs, alwaysApply: false },
              body
            ),
            ownership: "full"
          });
        }
        if (m.skills.length > 0) {
          const withResources = m.skills.filter((s) => s.resources.length > 0);
          fidelity.push({
            nodeType: "skills",
            fidelity: "degraded",
            count: m.skills.length,
            as: ".cursor/rules/skill-*.mdc (agent-requested by description)",
            lost: withResources.length > 0 ? `progressive disclosure \u2014 bundled resources in ${withResources.length} skill(s) are not loaded on demand` : "progressive disclosure \u2014 the whole rule body loads at once rather than in stages"
          });
        } else {
          fidelity.push({ nodeType: "skills", fidelity: "native", count: 0 });
        }
        if (m.agents.length > 0) {
          const body = [
            "Canonical agent roles, compiled for reference. Cursor custom modes are configured in",
            "the application UI rather than in the repository, so these cannot be applied",
            "automatically.",
            "",
            ...m.agents.flatMap((a) => [
              `## ${a.name}`,
              "",
              a.description,
              ...a.tools?.length ? ["", `Tools: ${a.tools.join(", ")}`] : [],
              ...a.model ? [`Model: ${a.model}`] : [],
              "",
              a.body.trim(),
              ""
            ])
          ].join("\n");
          files.push({ path: ".cursor/rules/agents-reference.mdc", content: mdc({ description: "Agent role definitions (reference)", alwaysApply: false }, body), ownership: "full" });
          fidelity.push({
            nodeType: "agents",
            fidelity: "degraded",
            count: m.agents.length,
            as: ".cursor/rules/agents-reference.mdc",
            lost: "Cursor custom modes are configured in the application, not the repo \u2014 roles are reference material only"
          });
        } else {
          fidelity.push({ nodeType: "agents", fidelity: "native", count: 0 });
        }
        for (const cmd of m.commands) {
          files.push({
            path: `.cursor/commands/${cmd.name}.md`,
            content: `# ${cmd.description}

${cmd.body.trim()}
`,
            ownership: "full"
          });
        }
        fidelity.push({ nodeType: "commands", fidelity: "native", count: m.commands.length });
        if (m.mcp.length > 0) {
          const servers = {};
          for (const s of m.mcp) {
            servers[s.name] = s.transport === "stdio" ? {
              command: s.command,
              ...s.args.length ? { args: s.args } : {},
              ...Object.keys(s.env).length ? { env: s.env } : {}
            } : { url: s.url };
          }
          files.push({
            path: ".cursor/mcp.json",
            content: JSON.stringify({ mcpServers: servers }, null, 2) + "\n",
            ownership: "full",
            noProvenance: true
          });
        }
        fidelity.push({ nodeType: "mcp", fidelity: "native", count: m.mcp.length });
        return { target: "cursor", files, fidelity };
      }
    };
  }
});

// packages/context/src/compilers/exports.ts
var init_exports = __esm({
  "packages/context/src/compilers/exports.ts"() {
    "use strict";
    init_claude();
    init_copilot();
    init_cursor();
    init_codex();
  }
});

// packages/context/src/compilers/index.ts
var COMPILERS;
var init_compilers = __esm({
  "packages/context/src/compilers/index.ts"() {
    "use strict";
    init_claude();
    init_codex();
    init_copilot();
    init_cursor();
    init_types2();
    COMPILERS = {
      claude: claudeCompiler,
      copilot: copilotCompiler,
      cursor: cursorCompiler,
      codex: codexCompiler
    };
  }
});

// packages/context/src/sync.ts
function compileAll(ctx, targets) {
  const list2 = targets ?? ctx.config.targets;
  return list2.map((t) => {
    const compiler = COMPILERS[t];
    if (!compiler) throw new ContextError(`Unknown target "${t}"`);
    return compiler.compile(ctx);
  });
}
async function sync(opts = {}) {
  const ctx = await loadContext({ root: opts.root });
  const results = compileAll(ctx, opts.targets);
  const flat = results.flatMap(
    (r) => r.files.map((f) => ({ ...f, target: r.target }))
  );
  const collisions = findCollisions(flat);
  if (collisions.length > 0) {
    throw new ContextError(
      "Two nodes compile to the same output path",
      collisions.map((c2) => ({
        level: "error",
        message: c2,
        hint: "Rename one of them \u2014 for example, a skill and a command sharing a name both compile to .github/prompts/<name>.prompt.md."
      }))
    );
  }
  const records = await writeOutputs(flat, {
    root: ctx.root,
    dryRun: opts.dryRun ?? false,
    force: opts.force ?? false,
    provenance: ctx.config.provenance
  });
  const names = Object.fromEntries(
    Object.entries(COMPILERS).map(([k, v]) => [k, v.displayName])
  );
  return {
    context: ctx,
    results,
    fidelity: summarize(results, names),
    records,
    hasDrift: records.some((r) => r.status === "drift"),
    hasChanges: records.some((r) => r.status !== "unchanged")
  };
}
async function check(opts = {}) {
  return sync({ ...opts, dryRun: true });
}
var init_sync = __esm({
  "packages/context/src/sync.ts"() {
    "use strict";
    init_compilers();
    init_errors2();
    init_fidelity();
    init_loader();
    init_writer();
  }
});

// packages/context/src/importer.ts
import { promises as fs4 } from "node:fs";
import * as path4 from "node:path";
async function read(p) {
  try {
    return await fs4.readFile(p, "utf8");
  } catch {
    return null;
  }
}
async function listFiles2(dir, filter) {
  try {
    const entries = await fs4.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && filter(e.name)).map((e) => path4.join(dir, e.name)).sort();
  } catch {
    return [];
  }
}
async function listDirs2(dir) {
  try {
    const entries = await fs4.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => path4.join(dir, e.name)).sort();
  } catch {
    return [];
  }
}
function toSlug(s) {
  const slug2 = s.toLowerCase().replace(/\.(instructions|prompt|agent|mdc|md)$/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  return slug2 || "unnamed";
}
function parseGlobs(value) {
  if (Array.isArray(value)) return value.map(String).filter((g) => g && g !== "**");
  if (typeof value === "string") {
    return value.split(",").map((g) => g.trim()).filter((g) => g && g !== "**");
  }
  return [];
}
function detectTargets(provenance) {
  const found = /* @__PURE__ */ new Set();
  for (const { from } of provenance) {
    if (from.startsWith(".github/")) found.add("copilot");
    else if (from === "CLAUDE.md" || from.startsWith(".claude/")) found.add("claude");
    else if (from.startsWith(".cursor/")) found.add("cursor");
    else if (from === "AGENTS.md" || from.endsWith("/AGENTS.md")) found.add("codex");
  }
  return [...found];
}
async function importContext(root, sourceDir = ".ctxmux") {
  const files = [];
  const provenance = [];
  const diagnostics = [];
  const rel = (p) => path4.relative(root, p);
  const out = (p) => path4.join(sourceDir, p);
  const instructionSources = [
    { file: path4.join(root, "CLAUDE.md"), label: "Claude Code" },
    { file: path4.join(root, ".github", "copilot-instructions.md"), label: "GitHub Copilot" },
    { file: path4.join(root, "AGENTS.md"), label: "Codex / AGENTS.md" }
  ];
  const found = [];
  for (const src of instructionSources) {
    const raw = await read(src.file);
    if (raw === null) continue;
    if (raw.includes("ctxmux:hash=") || raw.includes("ctxmux:begin")) {
      diagnostics.push({
        level: "warning",
        file: rel(src.file),
        message: "looks contextmux-generated \u2014 skipped to avoid re-importing our own output"
      });
      continue;
    }
    const { body } = parseFrontmatter(raw, rel(src.file));
    if (body.trim()) found.push({ label: src.label, file: rel(src.file), body: body.trim() });
  }
  if (found.length === 1) {
    files.push({ path: out("instructions.md"), content: found[0].body + "\n" });
    provenance.push({ from: found[0].file, to: out("instructions.md"), kind: "instructions" });
  } else if (found.length > 1) {
    const merged = found.map((f) => `<!-- imported from ${f.file} (${f.label}) -->

${f.body}`).join("\n\n---\n\n");
    files.push({ path: out("instructions.md"), content: merged + "\n" });
    for (const f of found) {
      provenance.push({ from: f.file, to: out("instructions.md"), kind: "instructions" });
    }
    diagnostics.push({
      level: "warning",
      file: out("instructions.md"),
      message: `merged ${found.length} instruction files (${found.map((f) => f.file).join(", ")})`,
      hint: "They may contradict each other. Review and reconcile before running `ctxmux sync`."
    });
  }
  for (const file of await listFiles2(
    path4.join(root, ".github", "instructions"),
    (n) => n.endsWith(".md")
  )) {
    const raw = await read(file);
    if (raw === null) continue;
    const { data, body } = parseFrontmatter(raw, rel(file));
    const name = toSlug(path4.basename(file, ".md"));
    const globs = parseGlobs(data["applyTo"]);
    const target = out(`rules/${name}.md`);
    if (files.some((f) => f.path === target)) {
      diagnostics.push({
        level: "warning",
        file: rel(file),
        message: `a rule named "${name}" was already imported from another source \u2014 skipped`,
        hint: "Rename one of them, or merge the two by hand if they differ."
      });
      continue;
    }
    files.push({
      path: target,
      content: serializeFrontmatter(
        {
          name,
          ...data["description"] ? { description: String(data["description"]) } : {},
          ...globs.length ? { globs } : {},
          ...String(data["applyTo"] ?? "") === "**" ? { alwaysApply: true } : {}
        },
        body
      )
    });
    provenance.push({ from: rel(file), to: target, kind: "rule" });
  }
  for (const file of await listFiles2(
    path4.join(root, ".cursor", "rules"),
    (n) => n.endsWith(".mdc") || n.endsWith(".md")
  )) {
    const raw = await read(file);
    if (raw === null) continue;
    const { data, body } = parseFrontmatter(raw, rel(file));
    const base = path4.basename(file).replace(/\.(mdc|md)$/, "");
    const orderMatch = /^(\d{1,3})-(.*)$/.exec(base);
    const priority = orderMatch ? Math.max(0, 100 - Number(orderMatch[1])) : 50;
    const name = toSlug(orderMatch ? orderMatch[2] : base);
    const target = out(`rules/${name}.md`);
    if (files.some((f) => f.path === target)) {
      diagnostics.push({
        level: "warning",
        file: rel(file),
        message: `a rule named "${name}" was already imported from another source \u2014 skipped`,
        hint: "Merge the two by hand if they differ."
      });
      continue;
    }
    files.push({
      path: target,
      content: serializeFrontmatter(
        {
          name,
          ...data["description"] ? { description: String(data["description"]) } : {},
          ...parseGlobs(data["globs"]).length ? { globs: parseGlobs(data["globs"]) } : {},
          ...data["alwaysApply"] === true ? { alwaysApply: true } : {},
          ...priority !== 50 ? { priority } : {}
        },
        body
      )
    });
    provenance.push({ from: rel(file), to: target, kind: "rule" });
  }
  for (const dir of await listDirs2(path4.join(root, ".claude", "skills"))) {
    const file = path4.join(dir, "SKILL.md");
    const raw = await read(file);
    if (raw === null) continue;
    const { data, body } = parseFrontmatter(raw, rel(file));
    const name = toSlug(String(data["name"] ?? path4.basename(dir)));
    const target = out(`skills/${name}/SKILL.md`);
    if (files.some((f) => f.path === target)) {
      diagnostics.push({
        level: "warning",
        file: rel(file),
        message: `a skill named "${name}" was already imported \u2014 skipped`,
        hint: "Two skills declare the same name. Rename one before importing."
      });
      continue;
    }
    files.push({
      path: target,
      content: serializeFrontmatter(
        {
          name,
          description: String(data["description"] ?? `Imported from ${rel(file)}`),
          ...data["allowed-tools"] ? { tools: data["allowed-tools"] } : {}
        },
        body
      )
    });
    provenance.push({ from: rel(file), to: target, kind: "skill" });
    for (const sub of ["references", "scripts", "assets"]) {
      for (const res of await listFiles2(path4.join(dir, sub), () => true)) {
        const content = await read(res);
        if (content === null) continue;
        files.push({ path: out(`skills/${name}/${sub}/${path4.basename(res)}`), content });
      }
    }
  }
  for (const [dir, ext] of [
    [path4.join(root, ".claude", "agents"), ".md"],
    [path4.join(root, ".github", "agents"), ".md"]
  ]) {
    for (const file of await listFiles2(dir, (n) => n.endsWith(ext))) {
      const raw = await read(file);
      if (raw === null) continue;
      const { data, body } = parseFrontmatter(raw, rel(file));
      const name = toSlug(String(data["name"] ?? path4.basename(file, ext)));
      const target = out(`agents/${name}.md`);
      if (files.some((f) => f.path === target)) {
        diagnostics.push({
          level: "warning",
          file: rel(file),
          message: `an agent named "${name}" was already imported \u2014 skipped`
        });
        continue;
      }
      const tools = typeof data["tools"] === "string" ? String(data["tools"]).split(",").map((t) => t.trim()).filter(Boolean) : Array.isArray(data["tools"]) ? data["tools"].map(String) : void 0;
      files.push({
        path: target,
        content: serializeFrontmatter(
          {
            name,
            description: String(data["description"] ?? `Imported from ${rel(file)}`),
            ...tools?.length ? { tools } : {},
            ...data["model"] ? { model: String(data["model"]) } : {}
          },
          body
        )
      });
      provenance.push({ from: rel(file), to: target, kind: "agent" });
    }
  }
  for (const dir of [
    path4.join(root, ".claude", "commands"),
    path4.join(root, ".cursor", "commands")
  ]) {
    for (const file of await listFiles2(dir, (n) => n.endsWith(".md"))) {
      const raw = await read(file);
      if (raw === null) continue;
      const { data, body } = parseFrontmatter(raw, rel(file));
      const name = toSlug(path4.basename(file, ".md"));
      const target = out(`commands/${name}.md`);
      if (files.some((f) => f.path === target)) continue;
      files.push({
        path: target,
        content: serializeFrontmatter(
          { name, description: String(data["description"] ?? `Imported from ${rel(file)}`) },
          body
        )
      });
      provenance.push({ from: rel(file), to: target, kind: "command" });
    }
  }
  const mcpSources = [
    path4.join(root, ".mcp.json"),
    path4.join(root, ".cursor", "mcp.json"),
    path4.join(root, ".vscode", "mcp.json")
  ];
  const servers = {};
  for (const src of mcpSources) {
    const raw = await read(src);
    if (raw === null) continue;
    try {
      const parsed = JSON.parse(raw);
      const map = parsed["mcpServers"] ?? parsed["servers"] ?? {};
      for (const [name, cfg] of Object.entries(map)) {
        if (servers[toSlug(name)]) continue;
        const env2 = {};
        const substituted = [];
        for (const [key, value] of Object.entries(cfg.env ?? {})) {
          const text = String(value);
          if (isEnvReference(text)) {
            env2[key] = text;
          } else {
            env2[key] = `\${${key}}`;
            substituted.push(key);
          }
        }
        if (substituted.length > 0) {
          diagnostics.push({
            level: "warning",
            file: rel(src),
            message: `did not copy the value of ${substituted.join(", ")} for mcp server "${name}"`,
            hint: `Replaced with a reference. Export ${substituted.join(", ")} in the environment where the server runs.`
          });
        }
        servers[toSlug(name)] = {
          ...cfg.command ? { transport: "stdio", command: cfg.command } : {},
          ...cfg.url ? { transport: cfg.type === "sse" ? "sse" : "http", url: cfg.url } : {},
          ...cfg.args ? { args: cfg.args } : {},
          ...Object.keys(env2).length ? { env: env2 } : {},
          readOnly: true
        };
        provenance.push({ from: rel(src), to: out("mcp.json"), kind: "mcp" });
      }
    } catch {
      diagnostics.push({ level: "warning", file: rel(src), message: "not valid JSON \u2014 skipped" });
    }
  }
  if (Object.keys(servers).length > 0) {
    files.push({
      path: out("mcp.json"),
      content: JSON.stringify({ servers }, null, 2) + "\n"
    });
    diagnostics.push({
      level: "warning",
      file: out("mcp.json"),
      message: `imported ${Object.keys(servers).length} MCP server(s), all marked readOnly: true`,
      hint: "Verify each one. An agent processing untrusted ticket text should not hold write-capable tools."
    });
  }
  if (files.length === 0) {
    diagnostics.push({
      level: "warning",
      message: "no existing agent configuration found",
      hint: "Run `ctxmux init` to scaffold a starter .ctxmux/ directory instead."
    });
  }
  const detected = detectTargets(provenance);
  const configPath = path4.join(root, sourceDir, "config.json");
  const configExists = await read(configPath).then((c2) => c2 !== null);
  if (!configExists && detected.length > 0 && detected.length < 4) {
    files.push({
      path: path4.join(sourceDir, "config.json"),
      content: JSON.stringify({ targets: detected }, null, 2) + "\n"
    });
    provenance.push({
      from: detected.map((t) => `${t} config`).join(", "),
      to: `${sourceDir}/config.json`,
      kind: "targets"
    });
  }
  return { files, provenance, diagnostics };
}
async function writeImport(root, result, opts = {}) {
  const written = [];
  for (const file of result.files) {
    const abs = path4.resolve(root, file.path);
    if (!opts.force) {
      try {
        await fs4.access(abs);
        continue;
      } catch {
      }
    }
    if (!opts.dryRun) await writeFileAtomic(abs, file.content);
    written.push(file.path);
  }
  return written;
}
var init_importer = __esm({
  "packages/context/src/importer.ts"() {
    "use strict";
    init_frontmatter();
    init_schema();
    init_fsx();
  }
});

// packages/context/src/packs.ts
import { promises as fs5 } from "node:fs";
import * as path5 from "node:path";
async function readIfExists3(p) {
  try {
    return await fs5.readFile(p, "utf8");
  } catch {
    return null;
  }
}
async function listDirs3(dir) {
  try {
    const entries = await fs5.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name).sort();
  } catch {
    return [];
  }
}
async function readPack(source, nameHint) {
  const skills = [];
  const rejected = [];
  let skillRoot = null;
  for (const candidate of SKILL_DIRS) {
    const dir = path5.join(source.dir, candidate);
    const entries = await listDirs3(dir);
    if (entries.length === 0) continue;
    skillRoot = candidate;
    for (const entry of entries) {
      const file = path5.join(dir, entry, "SKILL.md");
      const raw = await readIfExists3(file);
      if (raw === null) continue;
      const from = `${candidate}/${entry}/SKILL.md`;
      const { data, body } = parseFrontmatter(raw, from);
      const declared = String(data["name"] ?? entry);
      const name = SAFE_NAME.test(declared) ? declared : SAFE_NAME.test(entry) ? entry : null;
      if (name === null) {
        rejected.push({ from, reason: `neither "${declared}" nor "${entry}" is a usable name` });
        continue;
      }
      if (name !== declared) {
        rejected.push({
          from,
          reason: `declared the name "${declared}", which is not a plain name \u2014 using "${entry}" instead`
        });
      }
      const description = String(data["description"] ?? "");
      if (!description) continue;
      skills.push({
        name,
        description,
        body,
        from: `${candidate}/${entry}/SKILL.md`,
        ...data["license"] ? { license: String(data["license"]) } : {},
        ...data["homepage"] ? { homepage: String(data["homepage"]) } : {}
      });
    }
    break;
  }
  let instructions2;
  for (const candidate of INSTRUCTION_FILES) {
    const raw = await readIfExists3(path5.join(source.dir, candidate));
    if (raw === null) continue;
    const { body } = parseFrontmatter(raw, candidate);
    if (body.trim()) {
      instructions2 = body.trim();
      break;
    }
  }
  const licenseFile = await readIfExists3(path5.join(source.dir, "LICENSE"));
  const license = skills.find((s) => s.license)?.license ?? (licenseFile ? licenseFile.split("\n")[0]?.trim() || void 0 : void 0);
  return {
    name: nameHint ?? path5.basename(source.dir),
    source,
    skills,
    rejected,
    ...instructions2 ? { instructions: instructions2 } : {},
    ...license ? { license } : {},
    ...skillRoot ? {} : {}
  };
}
async function planInstall(root, pack, opts = {}) {
  const sourceDir = opts.sourceDir ?? ".ctxmux";
  const plan = { install: [], skipped: [] };
  for (const skill of pack.skills) {
    const rel = path5.join(sourceDir, "skills", skill.name, "SKILL.md");
    const existing = await readIfExists3(path5.resolve(root, rel));
    if (existing === null) {
      plan.install.push({ skill, path: rel, action: "create" });
      continue;
    }
    const { data, body } = parseFrontmatter(existing, rel);
    const owner = data[PACK_FIELD];
    if (owner !== pack.name && !opts.force) {
      plan.skipped.push({
        name: skill.name,
        path: rel,
        reason: owner ? `belongs to the "${owner}" pack` : "you wrote or edited this one"
      });
      continue;
    }
    plan.install.push({
      skill,
      path: rel,
      action: body.trim() === skill.body.trim() ? "unchanged" : "update"
    });
  }
  return plan;
}
function renderPackSkill(pack, skill) {
  return serializeFrontmatter(
    {
      name: skill.name,
      description: skill.description,
      [PACK_FIELD]: pack.name,
      "x-ctxmux-source": pack.source.origin,
      ...pack.source.commit ? { "x-ctxmux-commit": pack.source.commit } : {},
      ...skill.license ?? pack.license ? { "x-ctxmux-license": skill.license ?? pack.license } : {},
      ...skill.homepage ? { "x-ctxmux-homepage": skill.homepage } : {}
    },
    skill.body
  );
}
async function applyInstall(root, pack, plan) {
  const written = [];
  const base = path5.resolve(root);
  for (const item of plan.install) {
    if (item.action === "unchanged") continue;
    const abs = path5.resolve(base, item.path);
    if (!abs.startsWith(base + path5.sep)) {
      throw new Error(`refusing to install "${item.path}" \u2014 it resolves outside ${root}.`);
    }
    await writeFileAtomic(abs, renderPackSkill(pack, item.skill));
    written.push(item.path);
  }
  return written;
}
async function installedPacks(root, sourceDir = ".ctxmux") {
  const byPack = /* @__PURE__ */ new Map();
  const dir = path5.resolve(root, sourceDir, "skills");
  for (const entry of await listDirs3(dir)) {
    const raw = await readIfExists3(path5.join(dir, entry, "SKILL.md"));
    if (raw === null) continue;
    const { data } = parseFrontmatter(raw, entry);
    const name = data[PACK_FIELD];
    if (typeof name !== "string") continue;
    const record = byPack.get(name) ?? {
      name,
      ...typeof data["x-ctxmux-source"] === "string" ? { origin: data["x-ctxmux-source"] } : {},
      ...typeof data["x-ctxmux-commit"] === "string" ? { commit: data["x-ctxmux-commit"] } : {},
      skills: []
    };
    record.skills.push(entry);
    byPack.set(name, record);
  }
  return [...byPack.values()];
}
var SAFE_NAME, PACK_FIELD, SKILL_DIRS, INSTRUCTION_FILES;
var init_packs = __esm({
  "packages/context/src/packs.ts"() {
    "use strict";
    init_frontmatter();
    init_fsx();
    SAFE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    PACK_FIELD = "x-ctxmux-pack";
    SKILL_DIRS = ["skills", ".claude/skills", ".ctxmux/skills", ".openclaw/skills"];
    INSTRUCTION_FILES = ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"];
  }
});

// packages/context/src/index.ts
var src_exports = {};
__export(src_exports, {
  AgentSchema: () => AgentSchema,
  BEGIN: () => BEGIN,
  COMPILERS: () => COMPILERS,
  CommandSchema: () => CommandSchema,
  ConfigSchema: () => ConfigSchema,
  ContextError: () => ContextError,
  ContextModelSchema: () => ContextModelSchema,
  ContextParseError: () => ContextParseError,
  END: () => END,
  InstructionsSchema: () => InstructionsSchema,
  McpServerSchema: () => McpServerSchema,
  PACK_FIELD: () => PACK_FIELD,
  PROVENANCE_PREFIX: () => PROVENANCE_PREFIX,
  ProvenanceSchema: () => ProvenanceSchema,
  RepoQuerySchema: () => RepoQuerySchema,
  RuleSchema: () => RuleSchema,
  SkillSchema: () => SkillSchema,
  TARGETS: () => TARGETS,
  applyInstall: () => applyInstall,
  check: () => check,
  claudeCompiler: () => claudeCompiler,
  codexCompiler: () => codexCompiler,
  commonDirectory: () => commonDirectory,
  compileAll: () => compileAll,
  copilotCompiler: () => copilotCompiler,
  cursorCompiler: () => cursorCompiler,
  detectDrift: () => detectDrift,
  detectTargets: () => detectTargets,
  findCollisions: () => findCollisions,
  formatDiagnostics: () => formatDiagnostics,
  hashContent: () => hashContent,
  importContext: () => importContext,
  installedPacks: () => installedPacks,
  isEnvReference: () => isEnvReference,
  literalEnvKeys: () => literalEnvKeys,
  loadConfig: () => loadConfig,
  loadContext: () => loadContext,
  parseFrontmatter: () => parseFrontmatter,
  planInstall: () => planInstall,
  readPack: () => readPack,
  renderFidelityMarkdown: () => renderFidelityMarkdown,
  renderFidelityReport: () => renderFidelityReport,
  renderPackSkill: () => renderPackSkill,
  serializeFrontmatter: () => serializeFrontmatter,
  splitManaged: () => splitManaged,
  summarize: () => summarize,
  sync: () => sync,
  writeFileAtomic: () => writeFileAtomic,
  writeImport: () => writeImport,
  writeOutputs: () => writeOutputs
});
var init_src = __esm({
  "packages/context/src/index.ts"() {
    "use strict";
    init_schema();
    init_errors2();
    init_frontmatter();
    init_loader();
    init_writer();
    init_fsx();
    init_fidelity();
    init_sync();
    init_importer();
    init_packs();
    init_compilers();
    init_exports();
  }
});

// packages/cli/src/args.ts
function parseArgs(argv) {
  const positionals = [];
  const flags = /* @__PURE__ */ new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const body = arg.slice(2);
      const eq = body.indexOf("=");
      if (eq !== -1) {
        flags.set(body.slice(0, eq), body.slice(eq + 1));
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith("-")) {
          flags.set(body, next);
          i++;
        } else {
          flags.set(body, true);
        }
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      for (const ch of arg.slice(1)) flags.set(ch, true);
    } else {
      positionals.push(arg);
    }
  }
  return { command: positionals[0], positionals: positionals.slice(1), flags };
}
function flagString(args, ...names) {
  for (const n of names) {
    const v = args.flags.get(n);
    if (typeof v === "string") return v;
  }
  return void 0;
}
function flagBool(args, ...names) {
  return names.some((n) => args.flags.get(n) === true || args.flags.get(n) === "true");
}
function flagNumber(args, name, opts) {
  const raw = flagString(args, name);
  if (raw === void 0) {
    if (args.flags.get(name) === true) {
      throw new UsageError(`--${name} needs a number.`, `For example: --${name} ${opts.default}`);
    }
    return opts.default;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new UsageError(
      `--${name} must be a number, but was "${raw}".`,
      `For example: --${name} ${opts.default}`
    );
  }
  if (opts.integer !== false && !Number.isInteger(value)) {
    throw new UsageError(`--${name} must be a whole number, but was "${raw}".`);
  }
  if (opts.min !== void 0 && value < opts.min) {
    throw new UsageError(`--${name} must be at least ${opts.min}, but was ${value}.`);
  }
  if (opts.max !== void 0 && value > opts.max) {
    throw new UsageError(`--${name} must be at most ${opts.max}, but was ${value}.`);
  }
  return value;
}
var UsageError = class extends Error {
  constructor(message, hint) {
    super(message);
    this.hint = hint;
  }
  hint;
  name = "UsageError";
};

// packages/cli/src/ui.ts
var ESC = String.fromCharCode(27) + "[";
var useColor = Boolean(process.stdout.isTTY) && !process.env["NO_COLOR"] && process.env["TERM"] !== "dumb";
var wrap = (code) => (s) => useColor ? `${ESC}${code}m${s}${ESC}0m` : s;
var c = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  blue: wrap("34"),
  cyan: wrap("36")
};
function heading(s) {
  console.log("\n" + c.bold(s));
}
function info(s) {
  console.log(s);
}
function success(s) {
  console.log(c.green("OK") + "  " + s);
}
function warn(s) {
  console.log(c.yellow("!") + "   " + s);
}
function error(s) {
  console.error(c.red("x") + "   " + s);
}
function bullet(s) {
  console.log("  " + c.dim("-") + " " + s);
}
var STATUS_LABEL = {
  created: "create",
  updated: "update",
  unchanged: "ok",
  drift: "DRIFT",
  forced: "forced"
};

// packages/cli/src/commands/sync.ts
init_src();
function parseTargets(raw) {
  if (!raw) return void 0;
  const list2 = raw.split(",").map((t) => t.trim()).filter(Boolean);
  const bad = list2.filter((t) => !TARGETS.includes(t));
  if (bad.length > 0) {
    throw new ContextError(`Unknown target(s): ${bad.join(", ")}`, [
      { level: "error", message: `Valid targets are: ${TARGETS.join(", ")}` }
    ]);
  }
  return list2;
}
async function syncCommand(args) {
  const dryRun = flagBool(args, "dry-run", "n");
  const force = flagBool(args, "force", "f");
  const explain = flagBool(args, "explain");
  const targets = parseTargets(flagString(args, "targets", "t"));
  const root = flagString(args, "root") ?? process.cwd();
  const report2 = await sync({ root, targets, dryRun, force });
  for (const w of report2.context.warnings) {
    warn(`${w.file ? w.file + ": " : ""}${w.message}`);
    if (w.hint) info("    " + c.dim(w.hint));
  }
  const byTarget = /* @__PURE__ */ new Map();
  for (const r of report2.records) {
    const list2 = byTarget.get(r.target) ?? [];
    list2.push(r);
    byTarget.set(r.target, list2);
  }
  heading(dryRun ? "Plan" : "Written");
  for (const [target, records] of byTarget) {
    const changed = records.filter((r) => r.status !== "unchanged");
    const label = changed.length === 0 ? c.dim("no changes") : `${changed.length} change(s)`;
    info("  " + c.bold(target) + "  " + label);
    for (const r of records) {
      if (r.status === "unchanged") continue;
      const raw = STATUS_LABEL[r.status] ?? r.status;
      const tag = r.status === "drift" ? c.yellow(raw) : raw;
      bullet(tag.padEnd(8) + " " + r.path);
    }
  }
  if (explain) {
    heading("Fidelity");
    info(renderFidelityReport(report2.fidelity));
  }
  if (report2.hasDrift) {
    const drifted = report2.records.filter((r) => r.status === "drift");
    heading("Skipped: hand-edited");
    for (const r of drifted) bullet(r.path);
    info("");
    warn(`${drifted.length} generated file(s) were edited by hand and were left alone.`);
    info("    " + c.dim("Move your changes into .ctxmux/ so they survive, or re-run with --force to discard them."));
    return 2;
  }
  if (!dryRun && report2.hasChanges) {
    success(`Synced ${report2.records.filter((r) => r.status !== "unchanged").length} file(s).`);
  } else if (!report2.hasChanges) {
    success("Everything already up to date.");
  }
  if (!explain) {
    const degraded = report2.fidelity.filter((f) => f.degradedCount > 0);
    if (degraded.length > 0) {
      info("");
      info(c.dim(`Some content was degraded for ${degraded.map((d) => d.displayName).join(", ")}. Run with --explain for details.`));
    }
  }
  return 0;
}
async function checkCommand(args) {
  const strict = flagBool(args, "strict");
  const targets = parseTargets(flagString(args, "targets", "t"));
  const root = flagString(args, "root") ?? process.cwd();
  const report2 = await sync({ root, targets, dryRun: true });
  const changed = report2.records.filter((r) => r.status !== "unchanged");
  if (report2.hasDrift) {
    const drifted = report2.records.filter((r) => r.status === "drift");
    error(`${drifted.length} generated file(s) have been edited by hand:`);
    for (const r of drifted) bullet(r.path);
    info("");
    info("Generated files are overwritten by `ctxmux sync`. Move these edits into .ctxmux/.");
    return 2;
  }
  if (changed.length > 0) {
    error(`${changed.length} file(s) are out of date with .ctxmux/:`);
    for (const r of changed) bullet((STATUS_LABEL[r.status] ?? r.status) + " " + r.path);
    info("");
    info("Run `ctxmux sync` and commit the result.");
    return 1;
  }
  if (strict && !report2.context.config.provenance) {
    error("provenance is disabled in config, so drift cannot be detected and `check` cannot guarantee anything.");
    return 1;
  }
  success("All targets are in sync with .ctxmux/.");
  return 0;
}
function reportContextError(err) {
  if (err instanceof ContextError) {
    error(err.message);
    return 1;
  }
  throw err;
}

// packages/cli/src/commands/import.ts
init_src();
async function importCommand(args) {
  const root = flagString(args, "root") ?? process.cwd();
  const dryRun = flagBool(args, "dry-run", "n");
  const force = flagBool(args, "force", "f");
  const result = await importContext(root);
  if (result.files.length === 0) {
    for (const d of result.diagnostics) {
      warn(d.message);
      if (d.hint) info("    " + c.dim(d.hint));
    }
    return 1;
  }
  const written = await writeImport(root, result, { force, dryRun });
  const skipped = result.files.length - written.length;
  heading(dryRun ? "Would import" : "Imported");
  const byKind = /* @__PURE__ */ new Map();
  for (const p of result.provenance) {
    byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1);
  }
  const plural = (kind, n) => n === 1 || kind.endsWith("s") ? kind : `${kind}s`;
  for (const [kind, count] of byKind) bullet(`${count} ${plural(kind, count)}`);
  heading("Sources");
  const seen = /* @__PURE__ */ new Set();
  for (const p of result.provenance) {
    if (seen.has(p.from)) continue;
    seen.add(p.from);
    bullet(`${p.from} ${c.dim("->")} ${p.to}`);
  }
  if (result.diagnostics.length > 0) {
    heading("Review these");
    for (const d of result.diagnostics) {
      warn(`${d.file ? d.file + ": " : ""}${d.message}`);
      if (d.hint) info("    " + c.dim(d.hint));
    }
  }
  if (skipped > 0) {
    info("");
    warn(`${skipped} file(s) already existed in .ctxmux/ and were left alone. Use --force to replace them.`);
  }
  info("");
  if (dryRun) {
    success(`${written.length} file(s) would be written. Re-run without --dry-run to apply.`);
  } else {
    success(`Wrote ${written.length} file(s) to .ctxmux/.`);
    info("");
    info("Next: review the imported content, then run " + c.bold("ctxmux sync --explain"));
    info(c.dim("       to see how it compiles to each agent and what each one loses."));
  }
  return 0;
}

// packages/cli/src/commands/init.ts
init_src();
import { promises as fs9 } from "node:fs";
import * as path10 from "node:path";

// packages/repo/src/profile.ts
import { promises as fs6 } from "node:fs";
import * as path6 from "node:path";
async function readJson(p) {
  try {
    return JSON.parse(await fs6.readFile(p, "utf8"));
  } catch {
    return null;
  }
}
async function exists(p) {
  try {
    await fs6.access(p);
    return true;
  } catch {
    return false;
  }
}
async function detectPackageManager(root, pkg) {
  const declared = typeof pkg?.["packageManager"] === "string" ? pkg["packageManager"] : null;
  if (declared) {
    const [name, version] = declared.split("@");
    if (name === "pnpm" || name === "yarn" || name === "npm" || name === "bun") {
      return { pm: name, ...version ? { version } : {} };
    }
  }
  if (await exists(path6.join(root, "pnpm-lock.yaml"))) return { pm: "pnpm" };
  if (await exists(path6.join(root, "bun.lockb"))) return { pm: "bun" };
  if (await exists(path6.join(root, "yarn.lock"))) return { pm: "yarn" };
  if (await exists(path6.join(root, "package-lock.json"))) return { pm: "npm" };
  return { pm: "unknown" };
}
var FRAMEWORK_MARKERS = [
  ["next", "Next.js"],
  ["react", "React"],
  ["vue", "Vue"],
  ["svelte", "Svelte"],
  ["@angular/core", "Angular"],
  ["solid-js", "Solid"],
  ["astro", "Astro"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["@nestjs/core", "NestJS"],
  ["vitest", "Vitest"],
  ["jest", "Jest"],
  ["mocha", "Mocha"],
  ["@playwright/test", "Playwright"],
  ["cypress", "Cypress"],
  ["tailwindcss", "Tailwind CSS"],
  ["redux", "Redux"],
  ["@reduxjs/toolkit", "Redux Toolkit"],
  ["graphql", "GraphQL"],
  ["prisma", "Prisma"],
  ["drizzle-orm", "Drizzle"]
];
function deriveQualityGate(pm, scripts) {
  const runner = pm === "unknown" ? "npm run" : pm === "npm" ? "npm run" : `${pm} run`;
  const gate = [];
  const pick = (...candidates) => candidates.find((c2) => c2 in scripts) ?? null;
  const test = pick("test", "test:unit", "vitest", "jest");
  const lint = pick("lint", "eslint", "lint:check");
  const types = pick("typecheck", "type-check", "tsc", "types");
  const build = pick("build");
  if (types) gate.push(`${runner} ${types}`);
  if (lint) gate.push(`${runner} ${lint}`);
  if (test) gate.push(`${runner} ${test}`);
  if (gate.length === 0 && build) gate.push(`${runner} ${build}`);
  return gate;
}
async function detectProfile(root) {
  const notes = [];
  const pkg = await readJson(path6.join(root, "package.json"));
  const { pm, version } = await detectPackageManager(root, pkg);
  let nodeVersion;
  try {
    nodeVersion = (await fs6.readFile(path6.join(root, ".nvmrc"), "utf8")).trim();
  } catch {
    const engines = pkg?.["engines"]?.["node"];
    if (typeof engines === "string") nodeVersion = engines;
  }
  const workspaces = [];
  let isMonorepo = false;
  const patterns = [];
  if (Array.isArray(pkg?.["workspaces"])) patterns.push(...pkg["workspaces"]);
  else if (Array.isArray(pkg?.["workspaces"]?.["packages"])) patterns.push(...pkg["workspaces"]["packages"]);
  const pnpmWs = await fs6.readFile(path6.join(root, "pnpm-workspace.yaml"), "utf8").catch(() => null);
  if (pnpmWs) {
    for (const line of pnpmWs.split("\n")) {
      const m = /^\s*-\s*['"]?([^'"\n]+)['"]?\s*$/.exec(line);
      if (m?.[1]) patterns.push(m[1].trim());
    }
  }
  if (patterns.length > 0) {
    isMonorepo = true;
    for (const pattern of new Set(patterns)) {
      const base = pattern.split("/")[0];
      if (!base || base.includes("*")) continue;
      const dir = path6.join(root, base);
      let entries = [];
      try {
        entries = (await fs6.readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
      } catch {
        continue;
      }
      for (const entry of entries) {
        const wsPkg = await readJson(path6.join(dir, entry, "package.json"));
        if (!wsPkg) continue;
        workspaces.push({
          name: String(wsPkg["name"] ?? `${base}/${entry}`),
          dir: path6.join(base, entry),
          scripts: wsPkg["scripts"] ?? {}
        });
      }
    }
  }
  const allDeps = {
    ...pkg?.["dependencies"] ?? {},
    ...pkg?.["devDependencies"] ?? {},
    ...Object.fromEntries(
      workspaces.flatMap(() => [])
    )
  };
  const frameworks = FRAMEWORK_MARKERS.filter(([dep]) => dep in allDeps).map(([, name]) => name);
  const languages = [];
  if (pkg) languages.push("JavaScript");
  if (await exists(path6.join(root, "tsconfig.json"))) languages.push("TypeScript");
  for (const [file, lang] of [
    ["pyproject.toml", "Python"],
    ["requirements.txt", "Python"],
    ["go.mod", "Go"],
    ["Cargo.toml", "Rust"],
    ["pom.xml", "Java"],
    ["build.gradle", "Java"],
    ["build.gradle.kts", "Kotlin"],
    ["Gemfile", "Ruby"]
  ]) {
    if (await exists(path6.join(root, file))) languages.push(lang);
  }
  const scripts = pkg?.["scripts"] ?? {};
  const qualityGate2 = deriveQualityGate(pm, scripts);
  if (pm === "unknown" && pkg) {
    notes.push(
      "No lockfile or packageManager field found \u2014 an agent will not know which package manager to use."
    );
  }
  if (qualityGate2.length === 0 && pkg) {
    notes.push(
      "No test/lint/typecheck scripts detected. Agents have no way to verify their own work; add them to package.json or set qualityGate manually."
    );
  }
  if (isMonorepo && workspaces.length === 0) {
    notes.push("Workspace patterns declared but no packages resolved \u2014 check the glob patterns.");
  }
  return {
    root,
    packageManager: pm,
    ...version ? { packageManagerVersion: version } : {},
    ...nodeVersion ? { nodeVersion } : {},
    isMonorepo,
    workspaces: workspaces.sort((a, b) => a.name.localeCompare(b.name)),
    frameworks: [...new Set(frameworks)].sort(),
    languages: [...new Set(languages)].sort(),
    qualityGate: qualityGate2,
    notes
  };
}
function renderProfile(p) {
  const lines = ["## Project toolchain", ""];
  const install = p.packageManager === "unknown" ? null : p.packageManager === "pnpm" ? "pnpm install --frozen-lockfile" : p.packageManager === "yarn" ? "yarn install --immutable" : p.packageManager === "bun" ? "bun install --frozen-lockfile" : "npm ci";
  if (install) lines.push(`- **Install:** \`${install}\``);
  if (p.packageManagerVersion) {
    lines.push(`- **Package manager:** ${p.packageManager}@${p.packageManagerVersion} \u2014 do not use any other`);
  } else if (p.packageManager !== "unknown") {
    lines.push(`- **Package manager:** ${p.packageManager} \u2014 do not use any other`);
  }
  if (p.nodeVersion) lines.push(`- **Node:** ${p.nodeVersion}`);
  if (p.languages.length) lines.push(`- **Languages:** ${p.languages.join(", ")}`);
  if (p.frameworks.length) lines.push(`- **Stack:** ${p.frameworks.join(", ")}`);
  if (p.isMonorepo) {
    lines.push(`- **Monorepo:** ${p.workspaces.length} workspace(s): ${p.workspaces.map((w) => w.name).join(", ")}`);
  }
  if (p.qualityGate.length) {
    lines.push("", "**Before finalising any change, run all of these and fix every failure:**", "", "```bash");
    lines.push(...p.qualityGate);
    lines.push("```");
  }
  return lines.join("\n") + "\n";
}

// packages/repo/src/symbols.ts
var TS_PATTERNS = [
  { re: /^(export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/, kind: "function", nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: "class", nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?interface\s+([A-Za-z_$][\w$]*)/, kind: "interface", nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?type\s+([A-Za-z_$][\w$]*)\s*[=<]/, kind: "type", nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?enum\s+([A-Za-z_$][\w$]*)/, kind: "enum", nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[:=]/, kind: "const", nameGroup: 2, exportedGroup: 1 }
];
var PY_PATTERNS = [
  { re: /^def\s+([A-Za-z_][\w]*)/, kind: "function", nameGroup: 1 },
  { re: /^class\s+([A-Za-z_][\w]*)/, kind: "class", nameGroup: 1 }
];
var GO_PATTERNS = [
  { re: /^func\s+(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)/, kind: "function", nameGroup: 1 },
  { re: /^type\s+([A-Za-z_][\w]*)\s+struct/, kind: "struct", nameGroup: 1 },
  { re: /^type\s+([A-Za-z_][\w]*)\s+interface/, kind: "interface", nameGroup: 1 }
];
var RUST_PATTERNS = [
  { re: /^(pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][\w]*)/, kind: "function", nameGroup: 2, exportedGroup: 1 },
  { re: /^(pub\s+)?struct\s+([A-Za-z_][\w]*)/, kind: "struct", nameGroup: 2, exportedGroup: 1 },
  { re: /^(pub\s+)?enum\s+([A-Za-z_][\w]*)/, kind: "enum", nameGroup: 2, exportedGroup: 1 },
  { re: /^(pub\s+)?trait\s+([A-Za-z_][\w]*)/, kind: "trait", nameGroup: 2, exportedGroup: 1 }
];
var JVM_PATTERNS = [
  { re: /^(?:public\s+|private\s+|internal\s+)?(?:final\s+|abstract\s+|data\s+|open\s+)?class\s+([A-Za-z_][\w]*)/, kind: "class", nameGroup: 1 },
  { re: /^(?:public\s+|private\s+)?interface\s+([A-Za-z_][\w]*)/, kind: "interface", nameGroup: 1 },
  { re: /^(?:public\s+|private\s+|internal\s+)?fun\s+([A-Za-z_][\w]*)/, kind: "function", nameGroup: 1 }
];
var RUBY_PATTERNS = [
  { re: /^def\s+([A-Za-z_][\w?!]*)/, kind: "function", nameGroup: 1 },
  { re: /^class\s+([A-Z][\w]*)/, kind: "class", nameGroup: 1 },
  { re: /^module\s+([A-Z][\w]*)/, kind: "module", nameGroup: 1 }
];
var BY_EXT = {
  ".ts": { patterns: TS_PATTERNS, topLevelOnly: true },
  ".tsx": { patterns: TS_PATTERNS, topLevelOnly: true },
  ".js": { patterns: TS_PATTERNS, topLevelOnly: true },
  ".jsx": { patterns: TS_PATTERNS, topLevelOnly: true },
  ".mjs": { patterns: TS_PATTERNS, topLevelOnly: true },
  ".cjs": { patterns: TS_PATTERNS, topLevelOnly: true },
  ".py": { patterns: PY_PATTERNS, topLevelOnly: true },
  ".go": { patterns: GO_PATTERNS, topLevelOnly: true },
  ".rs": { patterns: RUST_PATTERNS, topLevelOnly: false },
  ".java": { patterns: JVM_PATTERNS, topLevelOnly: false },
  ".kt": { patterns: JVM_PATTERNS, topLevelOnly: false },
  ".kts": { patterns: JVM_PATTERNS, topLevelOnly: false },
  ".rb": { patterns: RUBY_PATTERNS, topLevelOnly: false }
};
function supportsSymbols(ext) {
  return ext in BY_EXT;
}
function refineKind(name, kind, ext) {
  if (ext !== ".tsx" && ext !== ".jsx" && ext !== ".ts" && ext !== ".js") return kind;
  if (kind !== "function" && kind !== "const") return kind;
  if (/^use[A-Z]/.test(name)) return "hook";
  if (/^[A-Z]/.test(name) && (ext === ".tsx" || ext === ".jsx")) return "component";
  return kind;
}
function docAbove(lines, index) {
  let i = index - 1;
  const collected = [];
  while (i >= 0 && (lines[i].trim() === "" || lines[i].trim().startsWith("@"))) i--;
  if (i < 0) return void 0;
  if (lines[i].trim().endsWith("*/")) {
    while (i >= 0) {
      const line = lines[i].trim();
      collected.unshift(line.replace(/^\/\*\*?|\*\/$|^\*\s?/g, "").trim());
      if (line.startsWith("/*")) break;
      i--;
    }
  } else {
    while (i >= 0) {
      const line = lines[i].trim();
      if (!line.startsWith("//") && !line.startsWith("#")) break;
      collected.unshift(line.replace(/^\/\/\s?|^#\s?/, "").trim());
      i--;
    }
  }
  let doc = collected.filter(Boolean).join(" ").trim();
  doc = doc.replace(/-{3,}/g, " ").replace(/={3,}/g, " ").replace(/\s+/g, " ").trim();
  const letters = doc.replace(/[^A-Za-z]/g, "").length;
  if (!doc || letters < 8 || letters / doc.length < 0.5) return void 0;
  return doc.length > 240 ? doc.slice(0, 240) + "\u2026" : doc;
}
function extractSymbols(content, ext) {
  const spec = BY_EXT[ext];
  if (!spec) return [];
  const { patterns, topLevelOnly } = spec;
  const lines = content.split("\n");
  const symbols = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (topLevelOnly && /^\s/.test(raw)) continue;
    const line = raw.trimStart();
    if (line.length === 0 || line.startsWith("//") || line.startsWith("*")) continue;
    for (const p of patterns) {
      const m = p.re.exec(line);
      if (!m) continue;
      const name = m[p.nameGroup];
      if (!name) continue;
      const exported = p.exportedGroup ? Boolean(m[p.exportedGroup]) : true;
      const doc = docAbove(lines, i);
      symbols.push({
        name,
        kind: refineKind(name, p.kind, ext),
        line: i + 1,
        exported,
        ...doc ? { doc } : {}
      });
      break;
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return symbols.filter((s) => {
    const key = `${s.name}:${s.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// packages/repo/src/indexer.ts
import { createHash as createHash2 } from "node:crypto";
import { promises as fs8 } from "node:fs";
import * as path8 from "node:path";

// packages/repo/src/git.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var exec = promisify(execFile);
async function git(root, args) {
  const { stdout } = await exec("git", ["-c", "core.quotePath=false", ...args], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true
  });
  return stdout;
}
async function listTrackedFiles(root) {
  try {
    const out = await git(root, ["ls-files", "-z", "--cached", "--exclude-standard"]);
    return out.split("\0").filter(Boolean);
  } catch {
    return null;
  }
}
var EMPTY = {
  commitCounts: /* @__PURE__ */ new Map(),
  lastTouched: /* @__PURE__ */ new Map(),
  coChange: /* @__PURE__ */ new Map()
};
async function collectGitSignals(root, maxCommits = 400) {
  let raw;
  try {
    raw = await git(root, [
      "log",
      `-n${maxCommits}`,
      "--pretty=format:%x00%ct",
      "--name-only",
      "--no-merges"
    ]);
  } catch {
    return EMPTY;
  }
  const signals = {
    commitCounts: /* @__PURE__ */ new Map(),
    lastTouched: /* @__PURE__ */ new Map(),
    coChange: /* @__PURE__ */ new Map()
  };
  for (const chunk of raw.split("\0")) {
    if (!chunk.trim()) continue;
    const lines = chunk.split("\n");
    const ts = Number(lines[0]?.trim());
    const files = lines.slice(1).map((l) => l.trim()).filter(Boolean);
    if (!Number.isFinite(ts) || files.length === 0) continue;
    for (const f of files) {
      signals.commitCounts.set(f, (signals.commitCounts.get(f) ?? 0) + 1);
      const prev = signals.lastTouched.get(f) ?? 0;
      if (ts > prev) signals.lastTouched.set(f, ts);
    }
    if (files.length > 25) continue;
    for (const a of files) {
      const row = signals.coChange.get(a) ?? /* @__PURE__ */ new Map();
      for (const b of files) {
        if (a === b) continue;
        row.set(b, (row.get(b) ?? 0) + 1);
      }
      signals.coChange.set(a, row);
    }
  }
  return signals;
}

// packages/repo/src/walk.ts
import { promises as fs7 } from "node:fs";
import * as path7 from "node:path";
var DEFAULT_IGNORES = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "vendor",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  ".pytest_cache",
  ".mypy_cache",
  ".gradle",
  "Pods",
  "DerivedData",
  ".svelte-kit"
]);
var IGNORED_SUFFIXES = [
  ".min.js",
  ".min.css",
  ".map",
  ".lock",
  ".snap",
  ".d.ts",
  "-lock.json",
  "-lock.yaml"
];
function isIgnoredFile(name) {
  return IGNORED_SUFFIXES.some((s) => name.endsWith(s));
}
async function walk(root, maxFiles = 2e4) {
  const results = [];
  const ceiling = maxFiles + 1;
  async function recurse(dir, depth) {
    if (results.length >= ceiling || depth > 12) return;
    let entries;
    try {
      entries = await fs7.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= ceiling) return;
      if (entry.name.startsWith(".") && entry.name !== ".github") continue;
      if (DEFAULT_IGNORES.has(entry.name)) continue;
      const full = path7.join(dir, entry.name);
      if (entry.isDirectory()) {
        await recurse(full, depth + 1);
      } else if (entry.isFile() && !isIgnoredFile(entry.name)) {
        results.push(path7.relative(root, full));
      }
    }
  }
  await recurse(root, 0);
  const truncated = results.length > maxFiles;
  return { files: results.sort().slice(0, maxFiles), truncated };
}

// packages/repo/src/indexer.ts
var MAX_FILE_BYTES = 512 * 1024;
var CACHE_VERSION = 2;
async function loadCache(root) {
  try {
    const raw = await fs8.readFile(path8.join(root, ".ctxmux", "cache", "index.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.version === CACHE_VERSION) return parsed;
  } catch {
  }
  return { version: CACHE_VERSION, entries: {} };
}
async function saveCache(root, cache) {
  try {
    const dir = path8.join(root, ".ctxmux", "cache");
    await fs8.mkdir(dir, { recursive: true });
    await fs8.writeFile(path8.join(dir, "index.json"), JSON.stringify(cache), "utf8");
  } catch {
  }
}
async function buildIndex(root, opts = {}) {
  const maxFiles = opts.maxFiles ?? 2e4;
  let paths = await listTrackedFiles(root);
  let truncated = false;
  if (paths === null || paths.length === 0) {
    const walked = await walk(root, maxFiles);
    paths = walked.files;
    truncated = walked.truncated;
  }
  paths = paths.filter((p) => !isIgnoredFile(path8.basename(p)));
  let skipped = Math.max(0, paths.length - maxFiles);
  if (skipped > 0) {
    paths = paths.slice(0, maxFiles);
    truncated = true;
  }
  const cache = opts.noCache ? { version: CACHE_VERSION, entries: {} } : await loadCache(root);
  const nextCache = { version: CACHE_VERSION, entries: {} };
  const files = [];
  for (const rel of paths) {
    const ext = path8.extname(rel);
    if (!supportsSymbols(ext)) {
      skipped++;
      continue;
    }
    const abs = path8.join(root, rel);
    let stat;
    try {
      stat = await fs8.stat(abs);
    } catch {
      skipped++;
      continue;
    }
    if (stat.size > MAX_FILE_BYTES) {
      skipped++;
      continue;
    }
    let content;
    try {
      content = await fs8.readFile(abs, "utf8");
    } catch {
      skipped++;
      continue;
    }
    const hash = createHash2("sha1").update(content).digest("hex").slice(0, 16);
    const cached = cache.entries[rel];
    const symbols = cached && cached.hash === hash ? cached.symbols : extractSymbols(content, ext);
    nextCache.entries[rel] = { hash, symbols, bytes: stat.size };
    files.push({ path: rel, ext, bytes: stat.size, symbols, hash });
  }
  if (!opts.noCache) await saveCache(root, nextCache);
  const git5 = opts.noGit ? { commitCounts: /* @__PURE__ */ new Map(), lastTouched: /* @__PURE__ */ new Map(), coChange: /* @__PURE__ */ new Map() } : await collectGitSignals(root);
  return { root, files, git: git5, builtAt: Date.now(), skipped, truncated };
}

// packages/repo/src/map.ts
import * as path9 from "node:path";
function estimateTokens(s) {
  return Math.ceil(s.length / 3.6);
}
var STOPWORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "when",
  "then",
  "should",
  "when",
  "have",
  "has",
  "not",
  "but",
  "are",
  "was",
  "were",
  "will",
  "would",
  "can",
  "could",
  "add",
  "fix",
  "update",
  "make",
  "use",
  "using",
  "need",
  "needs",
  "issue",
  "ticket",
  "bug",
  "feature",
  "task",
  "implement",
  "change",
  "changes"
]);
function tokenize(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).map((t) => t.toLowerCase()).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}
function wildcardToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}
function matchesPath(filePath, patterns) {
  if (patterns.length === 0) return true;
  return patterns.some((p) => {
    if (!p.includes("*")) return filePath.startsWith(p.replace(/\/$/, ""));
    const re = wildcardToRegExp(p.replace(/\*\*/g, "*"));
    return re.test(filePath) || filePath.split("/").some((seg) => re.test(seg));
  });
}
var KIND_WEIGHT = {
  hook: 1.4,
  component: 1.3,
  function: 1.2,
  interface: 1.1,
  type: 1.1
};
function scoreFiles(index, query) {
  const terms3 = query.text ? tokenize(query.text) : [];
  const termSet = new Set(terms3);
  const symbolPatterns = (query.symbols ?? []).map(wildcardToRegExp);
  const now = Date.now() / 1e3;
  const df = /* @__PURE__ */ new Map();
  if (termSet.size > 0) {
    for (const file of index.files) {
      const seen = /* @__PURE__ */ new Set();
      for (const t of tokenize(file.path)) if (termSet.has(t)) seen.add(t);
      for (const s of file.symbols) {
        for (const t of tokenize(s.name)) if (termSet.has(t)) seen.add(t);
      }
      for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const N = Math.max(1, index.files.length);
  const idf = (t) => Math.log(1 + N / (1 + (df.get(t) ?? 0)));
  const coScores = /* @__PURE__ */ new Map();
  for (const seed of query.seeds ?? []) {
    const row = index.git.coChange.get(seed);
    if (!row) continue;
    for (const [other, count] of row) {
      coScores.set(other, (coScores.get(other) ?? 0) + count);
    }
  }
  const maxCo = Math.max(1, ...coScores.values());
  const scored = [];
  for (const file of index.files) {
    if (!matchesPath(file.path, query.paths ?? [])) continue;
    let score = 0;
    const reasons = [];
    if (termSet.size > 0) {
      let pathScore = 0;
      for (const t of tokenize(file.path)) if (termSet.has(t)) pathScore += idf(t);
      if (pathScore > 0) {
        score += pathScore * 1.5;
        reasons.push("path match");
      }
    }
    const matched = [];
    for (const sym of file.symbols) {
      let symScore = 0;
      if (symbolPatterns.some((re) => re.test(sym.name))) {
        symScore += 6;
      }
      if (termSet.size > 0) {
        for (const t of tokenize(sym.name)) if (termSet.has(t)) symScore += idf(t) * 2;
        if (sym.doc) {
          for (const t of tokenize(sym.doc)) if (termSet.has(t)) symScore += idf(t) * 0.5;
        }
      }
      if (symScore > 0) {
        symScore *= KIND_WEIGHT[sym.kind] ?? 1;
        if (sym.exported) symScore *= 1.2;
        score += symScore;
        matched.push(sym);
      }
    }
    if (matched.length > 0) reasons.push(`${matched.length} matching symbol(s)`);
    const co = coScores.get(file.path);
    if (co) {
      score += co / maxCo * 5;
      reasons.push("changes alongside seed files");
    }
    const last = index.git.lastTouched.get(file.path);
    if (last) {
      const ageDays = (now - last) / 86400;
      const recency = Math.exp(-ageDays / 90);
      if (recency > 0.05 && score > 0) {
        score += recency * 2;
        if (recency > 0.5) reasons.push("recently changed");
      }
    }
    if (score > 0) {
      const density = matched.length / Math.max(4, file.symbols.length);
      score *= 1 + density * 0.5;
      scored.push({ path: file.path, score, symbols: matched.length > 0 ? matched : file.symbols.slice(0, 3), reasons });
    }
  }
  return scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}
function renderSymbol(s) {
  const doc = s.doc ? ` \u2014 ${s.doc.split(". ")[0].slice(0, 100)}` : "";
  return `  ${s.kind} \`${s.name}\`:${s.line}${doc}`;
}
function renderMap(scored, budget, totalCandidates) {
  const header2 = "## Relevant code in this repository\n\n";
  if (scored.length === 0) {
    const empty = `${header2}_No existing code matched this task. Nothing similar appears to exist yet, so writing something new is appropriate \u2014 though it is worth trying a synonym before concluding that._
`;
    return { files: [], text: empty, estimatedTokens: estimateTokens(empty), omitted: 0, totalCandidates };
  }
  const footer = (omitted) => omitted > 0 ? `
_${omitted} further matching file(s) omitted to stay within the context budget._
` : "";
  const stages = [
    // Stage 1 — full detail.
    (files) => files.map((f) => `**${f.path}**${f.reasons.length ? ` _(${f.reasons.join(", ")})_` : ""}
${f.symbols.map(renderSymbol).join("\n")}`).join("\n\n"),
    // Stage 2 — symbol names only.
    (files) => files.map((f) => `**${f.path}** \u2014 ${f.symbols.map((s) => `\`${s.name}\``).join(", ")}`).join("\n"),
    // Stage 3 — paths only.
    (files) => files.map((f) => `- ${f.path}`).join("\n"),
    // Stage 4 — directory skeleton.
    (files) => {
      const dirs = /* @__PURE__ */ new Map();
      for (const f of files) {
        const d = path9.dirname(f.path);
        dirs.set(d, (dirs.get(d) ?? 0) + 1);
      }
      return [...dirs].sort((a, b) => b[1] - a[1]).map(([d, n]) => `- ${d}/ (${n} relevant file${n === 1 ? "" : "s"})`).join("\n");
    }
  ];
  for (const stage of stages) {
    let lo = 0;
    let hi = scored.length;
    let best = "";
    let bestCount = 0;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const body = stage(scored.slice(0, mid));
      const full = header2 + body + footer(scored.length - mid);
      if (estimateTokens(full) <= budget) {
        best = full;
        bestCount = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (bestCount >= Math.min(scored.length, 5) || bestCount > 0 && bestCount === scored.length) {
      return {
        files: scored.slice(0, bestCount),
        text: best,
        estimatedTokens: estimateTokens(best),
        omitted: scored.length - bestCount,
        totalCandidates
      };
    }
  }
  const msg = `${header2}_Context budget of ${budget} tokens is too small to render a useful map (${scored.length} matching files). Increase the budget or narrow the query._
`;
  return {
    files: [],
    text: msg,
    estimatedTokens: estimateTokens(msg),
    omitted: scored.length,
    totalCandidates
  };
}
function buildMap(index, query) {
  const scored = scoreFiles(index, query);
  return renderMap(scored, query.budget, scored.length);
}

// packages/cli/src/prompt.ts
import * as readline from "node:readline/promises";
function interactive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}
async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}
async function selectOne(title, choices, defaultValue) {
  const index = Math.max(0, choices.findIndex((ch) => ch.value === defaultValue));
  process.stdout.write(`
${c.bold(title)}
`);
  choices.forEach((ch, i) => {
    const marker = i === index ? c.green(">") : " ";
    const note = ch.note ? c.dim(`  ${ch.note}`) : "";
    process.stdout.write(`  ${marker} ${i + 1}) ${ch.label}${note}
`);
  });
  const answer = await ask(c.dim(`  choose [${index + 1}]: `));
  return interpretOne(answer, choices, index);
}
function interpretOne(answer, choices, defaultIndex) {
  const fallback = choices[defaultIndex].value;
  const trimmed = answer.trim();
  if (!trimmed) return fallback;
  const picked = Number(trimmed);
  if (Number.isInteger(picked) && picked >= 1 && picked <= choices.length) {
    return choices[picked - 1].value;
  }
  const byName = choices.find((ch) => ch.value === trimmed.toLowerCase());
  return byName ? byName.value : fallback;
}
async function selectMany(title, choices, defaults) {
  const chosen = new Set(defaults);
  process.stdout.write(`
${c.bold(title)}
`);
  choices.forEach((ch, i) => {
    const mark = chosen.has(ch.value) ? c.green("x") : " ";
    const note = ch.note ? c.dim(`  ${ch.note}`) : "";
    process.stdout.write(`  [${mark}] ${i + 1}) ${ch.label}${note}
`);
  });
  const preset = [...chosen].map((v) => choices.findIndex((ch) => ch.value === v) + 1).filter((n) => n > 0).join(",");
  const answer = await ask(c.dim(`  choose, comma separated [${preset || "none"}]: `));
  return interpretMany(answer, choices, [...chosen]);
}
function interpretMany(answer, choices, defaults) {
  const trimmed = answer.trim();
  if (!trimmed) return [...new Set(defaults)];
  const picked = trimmed.split(/[,\s]+/).map((token) => {
    const n = Number(token);
    if (Number.isInteger(n) && n >= 1 && n <= choices.length) return choices[n - 1].value;
    return choices.find((ch) => ch.value === token.toLowerCase())?.value;
  }).filter((v) => Boolean(v));
  return picked.length > 0 ? [...new Set(picked)] : [...new Set(defaults)];
}

// packages/cli/src/starter.ts
function instructions(profile) {
  return [
    "# Project conventions",
    "",
    "Read this before making any change.",
    "",
    renderProfile(profile).trim(),
    "",
    "## Working agreement",
    "",
    "- Make the smallest change that satisfies the request. Resist adjacent improvements.",
    "- Match the conventions of the surrounding code over any general style preference.",
    "- If a requirement is ambiguous, state the assumption you made in the pull request",
    "  description rather than guessing silently.",
    ""
  ].join("\n");
}
var REUSE_SKILL = `---
name: find-before-writing
description: Use before creating any new helper, hook, component, selector, type or utility \u2014 search the codebase for an existing implementation first.
repoQuery:
  terms: ["helper", "util", "hook", "component"]
  budget: 1500
---

# Find before writing

The most common defect in generated code is a second implementation of something that
already exists. It passes review because it is locally correct, and it costs the codebase
permanently.

Before adding any new shared unit \u2014 a helper, hook, component, selector, type, constant \u2014
search for an existing one.

1. Search by **name**: the thing you are about to write, and two or three synonyms.
2. Search by **shape**: the signature or return type you need.
3. Search the **directory** where such a thing would live if it existed.

If you find something close but not exact, prefer extending it over duplicating it \u2014 unless
extending would change behaviour for existing callers, in which case add the new variant
beside it and say why in the pull request description.

Only write something new once all three searches come back empty.
`;
var TEST_INTEGRITY_SKILL = `---
name: test-integrity
description: Use whenever a test fails, or when adding tests for a change. Governs what may and may not be changed to make a suite pass.
---

# Test integrity

A failing existing test is information. It is almost never noise.

**When an existing test fails after your change**, the default conclusion is that your
implementation is wrong. Fix the implementation.

You may change an existing test only when the task explicitly changes the behaviour that
test asserts. When that happens, say so in the pull request description and explain what
behaviour changed and why.

**Never**:
- weaken an assertion to make it pass
- delete or skip a test that your change broke
- adjust fixtures or mocks so that new, possibly incorrect, code looks correct

**When adding tests**, cover the branch you added, the boundary conditions around it, and
the case where nothing should change. A test that only exercises the happy path documents
the feature without defending it.
`;
var SCOPE_RULE = `---
name: scope-discipline
description: Keep changes within the boundaries of the task
alwaysApply: true
priority: 80
---

Change only what the task requires.

Before opening a pull request, review your own diff and remove anything that is not needed:
unrelated refactors, renames, reformatting, dependency bumps, and configuration edits that
nobody asked for.

Configuration files \u2014 build config, TypeScript config, package manifests, CI workflows \u2014 are
outside the scope of an ordinary task. If one genuinely must change, call it out explicitly
rather than folding it in.

A reviewer should be able to read the diff and see only the task.
`;
var REVIEWER_AGENT = `---
name: change-reviewer
description: Reviews a diff for scope creep, duplicated logic and weakened tests before a pull request is opened.
archetype: any
---

You review a change before it is proposed. You are not looking for style problems \u2014 a linter
handles those. You are looking for the three things that get through review and cost the most
later.

**1. Scope.** Does every changed file belong to the task? Flag unrelated refactors, renames,
reformatting, and configuration edits.

**2. Duplication.** Does anything added here already exist elsewhere in the codebase? Search
before concluding it does not.

**3. Test integrity.** Were existing assertions weakened, deleted or skipped? Were fixtures
adjusted to fit new behaviour? Does each new branch have a test that would fail if the branch
were wrong?

Report findings most-severe first. If there are none, say so plainly rather than manufacturing
feedback.
`;
function starterFiles(profile) {
  return [
    { path: ".ctxmux/instructions.md", content: instructions(profile) },
    { path: ".ctxmux/rules/scope-discipline.md", content: SCOPE_RULE },
    { path: ".ctxmux/skills/find-before-writing/SKILL.md", content: REUSE_SKILL },
    { path: ".ctxmux/skills/test-integrity/SKILL.md", content: TEST_INTEGRITY_SKILL },
    { path: ".ctxmux/agents/change-reviewer.md", content: REVIEWER_AGENT },
    {
      path: ".ctxmux/mcp.json",
      content: JSON.stringify(
        {
          servers: {
            // The repository index, exposed as tools. Delegated agents cannot take an
            // injected repo map at prompt-assembly time, so this is the only way they get
            // repository knowledge. Read-only by construction.
            "ctxmux-repo": {
              transport: "stdio",
              command: "npx",
              args: ["-y", "@contextmux/mcp-repo"],
              readOnly: true
            }
          }
        },
        null,
        2
      ) + "\n"
    },
    {
      path: ".ctxmux/config.json",
      content: JSON.stringify(
        { targets: ["claude", "copilot", "cursor", "codex"], provenance: true },
        null,
        2
      ) + "\n"
    }
  ];
}

// packages/cli/src/workflows.ts
var WORKFLOW_MARKER = "ctxmux:workflow";
var WORKFLOW_FEATURES = ["share-state"];
function allowGlobs(profile) {
  if (profile.isMonorepo && profile.workspaces.length > 0) {
    const roots = new Set(profile.workspaces.map((w) => w.dir.split("/")[0]).filter(Boolean));
    if (roots.size > 0) return [...roots].sort().map((r) => `${r}/**`);
  }
  return ["src/**", "test/**"];
}
function header(name) {
  return [
    `# ${name}`,
    `#`,
    `# Generated by contextmux (${WORKFLOW_MARKER}). Yours to edit \u2014 nothing regenerates it.`,
    `#`,
    `# This does nothing until you set the repository variable CTXMUX_ENABLED to true.`,
    `# Settings -> Secrets and variables -> Actions -> Variables.`
  ].join("\n");
}
function secretsFor(tracker) {
  const secrets = ["CTXMUX_TOKEN"];
  if (tracker === "jira") secrets.push("JIRA_URL", "JIRA_EMAIL", "JIRA_API_TOKEN");
  return secrets;
}
function runWorkflow(ctx) {
  const allow = allowGlobs(ctx.profile).join(",");
  const jira = ctx.tracker === "jira";
  return `${header("Drive tasks to pull requests, under gates")}

name: contextmux run

on:
  workflow_dispatch:
    inputs:
      task:
        description: '${jira ? "Ticket key" : "Task id"}. Leave empty to take the next eligible one.'
        required: false
  # Uncomment to pick work up on a schedule, once you trust it.
  # schedule:
  #   - cron: '0 */2 * * 1-5'

concurrency:
  # Serialise, so two runs cannot pick up the same task.
  group: ctxmux-\${{ inputs.task || 'batch' }}
  cancel-in-progress: false

permissions:
  # write, because run state is pushed to a branch of its own \u2014 see share-state below.
  contents: write
  issues: write
  pull-requests: write

jobs:
  run:
    # A kill switch that does not require editing this file to use.
    if: vars.CTXMUX_ENABLED == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v7

      - uses: contextmux/contextmux/packages/action@v0
        with:
          command: run
          task: \${{ inputs.task }}
          tracker: ${ctx.tracker}
          # copilot delegates to GitHub's cloud agent, which opens its own pull request. A
          # driven agent (claude) works in a worktree on this runner instead, so it needs
          # \`--open-pr\` below \u2014 without it the runner is destroyed with the work still on it.
          agent: copilot
          # Detected from this repository's layout. Narrow it further if a task should not
          # reach all of these.
          allow: '${allow}'
          max-rounds: '2'
          # Only meaningful for a driven agent; copilot has already opened one by this point,
          # and the flag is ignored because there is no local branch to push.
          args: '--open-pr'
          # Publishes what this run recorded, so the review workflow can find it. Without it,
          # that workflow runs in a fresh checkout, finds nothing, and the feedback reaches
          # nobody.
          share-state: 'true'
          github-token: \${{ secrets.CTXMUX_TOKEN }}${jira ? `
          jira-url: \${{ secrets.JIRA_URL }}
          jira-email: \${{ secrets.JIRA_EMAIL }}
          jira-token: \${{ secrets.JIRA_API_TOKEN }}` : ""}
`;
}
function reviewWorkflow(ctx) {
  return `${header("Feed review feedback back to the agent")}
#
# Separate from the run workflow on purpose: picking up work and reacting to a review are
# different triggers with different permissions, and combining them gives the review path
# write access it does not need.

name: contextmux review

on:
  pull_request_review:
    types: [submitted]
  issue_comment:
    types: [created]

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  review:
    if: vars.CTXMUX_ENABLED == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7

      - uses: contextmux/contextmux/packages/action@v0
        with:
          command: event
          tracker: ${ctx.tracker}
          # Fetches the state the run workflow published. This is the whole reason this
          # workflow can find the run it is meant to be advancing.
          share-state: 'true'
          github-token: \${{ secrets.CTXMUX_TOKEN }}
`;
}
function workflowFiles(ctx) {
  if (!ctx.hasRemote) return [];
  return [
    { path: ".github/workflows/ctxmux-run.yml", content: runWorkflow(ctx) },
    { path: ".github/workflows/ctxmux-review.yml", content: reviewWorkflow(ctx) }
  ];
}
function remainingSetup(ctx) {
  const todo = secretsFor(ctx.tracker).map((s) => `${s} is not set as a repository secret`);
  todo.push("the Copilot coding agent is not enabled on this repository");
  todo.push("CTXMUX_ENABLED is unset, so nothing runs \u2014 set it to 'true' when you are ready");
  return todo;
}

// packages/cli/src/commands/init.ts
import { spawn } from "node:child_process";
var GITIGNORE_STANZA = [
  "# contextmux \u2014 run state and the index cache are local, not shared",
  ".ctxmux/state/",
  ".ctxmux/cache/"
];
async function ensureGitignore(root) {
  const file = path10.join(root, ".gitignore");
  const existing = await fs9.readFile(file, "utf8").catch(() => "");
  if (existing.includes(".ctxmux/state/")) return false;
  const body = existing.trimEnd();
  await writeFileAtomic(file, `${body ? `${body}

` : ""}${GITIGNORE_STANZA.join("\n")}
`);
  return true;
}
function detectTracker() {
  if (process.env["JIRA_URL"]?.trim()) return "jira";
  if (process.env["GITHUB_REPOSITORY"]?.trim() || process.env["CTXMUX_REPO"]?.trim()) return "github";
  return "file";
}
function hasGitRemote(root) {
  return new Promise((resolve17) => {
    const child = spawn("git", ["remote"], { cwd: root, windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => out += d);
    child.on("error", () => resolve17(false));
    child.on("close", () => resolve17(out.trim().length > 0));
  });
}
async function initCommand(args) {
  const root = flagString(args, "root") ?? process.cwd();
  const force = flagBool(args, "force", "f");
  const dir = path10.join(root, ".ctxmux");
  const already = await fs9.access(dir).then(() => true).catch(() => false);
  if (already && !force) {
    warn(".ctxmux/ already exists \u2014 leaving it alone.");
    info("    " + c.dim("Re-run with --force to add any starter files that are missing."));
    info("    " + c.dim("`ctxmux sync` compiles what is already there."));
    return 1;
  }
  const profile = await detectProfile(root);
  heading("Detected");
  bullet(`package manager: ${profile.packageManager}${profile.packageManagerVersion ? "@" + profile.packageManagerVersion : ""}`);
  if (profile.nodeVersion) bullet(`node: ${profile.nodeVersion}`);
  if (profile.languages.length) bullet(`languages: ${profile.languages.join(", ")}`);
  if (profile.frameworks.length) bullet(`stack: ${profile.frameworks.join(", ")}`);
  if (profile.isMonorepo) bullet(`monorepo: ${profile.workspaces.length} workspace(s)`);
  if (profile.qualityGate.length) bullet(`quality gate: ${profile.qualityGate.join(" && ")}`);
  for (const note of profile.notes) {
    info("");
    warn(note);
  }
  const imported = already ? null : await importContext(root).catch(() => null);
  const foundExisting = (imported?.provenance.length ?? 0) > 0;
  const written = [];
  if (foundExisting && imported) {
    for (const file of imported.files) {
      await writeFileAtomic(path10.join(root, file.path), file.content);
      written.push(file.path);
    }
    heading("Imported");
    for (const p of imported.provenance.slice(0, 8)) bullet(`${p.from} -> ${p.to}`);
    if (imported.provenance.length > 8) {
      info(c.dim(`    ...and ${imported.provenance.length - 8} more`));
    }
  }
  for (const file of foundExisting ? [] : starterFiles(profile)) {
    const abs = path10.join(root, file.path);
    const exists3 = await fs9.access(abs).then(() => true).catch(() => false);
    if (exists3) continue;
    await writeFileAtomic(abs, file.content);
    written.push(file.path);
  }
  const detected = imported ? detectTargets(imported.provenance) : [];
  const askable = interactive() && !flagBool(args, "yes", "y");
  let targets = detected.length > 0 ? detected : ["claude", "copilot", "cursor", "codex"];
  let agent = "claude";
  let tracker = detectTracker();
  if (askable) {
    if (detected.length === 0) {
      targets = await selectMany(
        "Which agents should get your rules?",
        [
          { value: "claude", label: "Claude Code", note: "CLAUDE.md" },
          { value: "copilot", label: "GitHub Copilot", note: ".github/copilot-instructions.md" },
          { value: "cursor", label: "Cursor", note: ".cursor/rules/" },
          { value: "codex", label: "Codex", note: "AGENTS.md" }
        ],
        targets
      );
    }
    agent = await selectOne(
      "Which agent should run tasks?",
      [
        { value: "claude", label: "Claude Code", note: "runs here, needs ANTHROPIC_API_KEY" },
        { value: "copilot", label: "GitHub Copilot", note: "runs in GitHub, opens its own PR" },
        { value: "codex", label: "Codex", note: "runs here" },
        { value: "cursor", label: "Cursor", note: "runs here" }
      ],
      targets.includes("copilot") && !targets.includes("claude") ? "copilot" : "claude"
    );
    tracker = await selectOne(
      "Where do tasks come from?",
      [
        { value: "file", label: "Markdown files in the repo", note: ".ctxmux/tasks/" },
        { value: "github", label: "GitHub issues", note: "needs gh auth or GITHUB_TOKEN" },
        { value: "jira", label: "Jira", note: "needs JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN" }
      ],
      tracker
    );
  }
  await writeFileAtomic(
    path10.join(root, ".ctxmux", "config.json"),
    JSON.stringify({ targets, agent, tracker }, null, 2) + "\n"
  );
  if (!written.includes(".ctxmux/config.json")) written.push(".ctxmux/config.json");
  const ignored = await ensureGitignore(root);
  const ctx = {
    profile,
    tracker,
    hasRemote: await hasGitRemote(root)
  };
  const workflows = [];
  if (!flagBool(args, "no-workflows")) {
    for (const file of workflowFiles(ctx)) {
      const abs = path10.join(root, file.path);
      if (await fs9.access(abs).then(() => true, () => false)) continue;
      await writeFileAtomic(abs, file.content);
      workflows.push(file.path);
    }
  }
  const report2 = await sync({ root, targets });
  const generated = report2.records.filter((r) => r.status === "created" || r.status === "updated");
  heading("Created");
  for (const p of written) bullet(p);
  for (const p of workflows) bullet(p);
  if (ignored) bullet(`.gitignore ${c.dim("(added .ctxmux/state/ and .ctxmux/cache/)")}`);
  if (generated.length > 0) {
    heading(`Compiled to ${targets.join(", ")}`);
    for (const r of generated.slice(0, 10)) bullet(r.path);
    if (generated.length > 10) info(c.dim(`    ...and ${generated.length - 10} more`));
  }
  info("");
  success(
    `${written.length + workflows.length} file(s) written, ${generated.length} compiled. Tasks will run through ${c.bold(agent)} from ${c.bold(tracker)}.`
  );
  if (report2.records.some((r) => r.status === "drift")) {
    info("");
    warn("Some generated files were edited by hand and were left alone.");
    info("    " + c.dim("Move those edits into .ctxmux/ so they survive, or re-run sync with --force."));
  }
  if (workflows.length > 0) {
    info("");
    warn("Before the workflow can run:");
    for (const item of remainingSetup(ctx)) bullet(item);
  }
  info("");
  info("Next:");
  info("  " + c.bold('ctxmux run "add a date helper" --dry-run') + c.dim("   see what it would do, for free"));
  info("  " + c.bold("ctxmux doctor") + c.dim("                              check for anything that will fail silently"));
  return 0;
}

// packages/cli/src/commands/doctor.ts
init_src();
import { promises as fs10 } from "node:fs";
import * as path11 from "node:path";
async function exists2(p) {
  try {
    await fs10.access(p);
    return true;
  } catch {
    return false;
  }
}
async function doctorCommand(args) {
  const root = flagString(args, "root") ?? process.cwd();
  const checks = [];
  let ctx;
  try {
    ctx = await loadContext({ root });
    const m = ctx.model;
    const total = m.rules.length + m.skills.length + m.agents.length + m.commands.length;
    checks.push({
      name: "canonical source",
      status: "pass",
      detail: `${total} node(s): ${m.rules.length} rules, ${m.skills.length} skills, ${m.agents.length} agents, ${m.commands.length} commands`
    });
    if (total === 0 && !m.instructions) {
      checks.push({
        name: "content",
        status: "warn",
        detail: ".ctxmux/ exists but is empty",
        hint: "Run `ctxmux import` to pull in existing agent config, or `ctxmux init` for a starter pack."
      });
    }
  } catch (err) {
    checks.push({
      name: "canonical source",
      status: "fail",
      detail: err.message,
      hint: "Run `ctxmux import` or `ctxmux init` first."
    });
  }
  if (ctx) {
    try {
      const report2 = await sync({ root, dryRun: true });
      const drifted = report2.records.filter((r) => r.status === "drift");
      const stale = report2.records.filter((r) => r.status !== "unchanged" && r.status !== "drift");
      if (drifted.length > 0) {
        checks.push({
          name: "generated files",
          status: "fail",
          detail: `${drifted.length} hand-edited: ${drifted.map((d) => d.path).join(", ")}`,
          hint: "Those edits will be lost on the next sync. Move them into .ctxmux/."
        });
      } else if (stale.length > 0) {
        checks.push({
          name: "generated files",
          status: "warn",
          detail: `${stale.length} out of date`,
          hint: "Run `ctxmux sync`."
        });
      } else {
        checks.push({ name: "generated files", status: "pass", detail: "all in sync" });
      }
    } catch (err) {
      checks.push({ name: "generated files", status: "fail", detail: err.message });
    }
  }
  const profile = await detectProfile(root);
  if (profile.packageManager === "unknown") {
    checks.push({
      name: "package manager",
      status: "warn",
      detail: "could not be determined",
      hint: "Add a `packageManager` field to package.json so agents install with the right tool."
    });
  } else {
    checks.push({
      name: "package manager",
      status: "pass",
      detail: profile.packageManagerVersion ? `${profile.packageManager}@${profile.packageManagerVersion}` : profile.packageManager
    });
  }
  if (profile.qualityGate.length === 0) {
    checks.push({
      name: "quality gate",
      status: "warn",
      detail: "no test/lint/typecheck scripts found",
      hint: "Agents have no way to verify their own work without these."
    });
  } else {
    checks.push({
      name: "quality gate",
      status: "pass",
      detail: profile.qualityGate.join(" && ")
    });
  }
  for (const note of profile.notes) {
    checks.push({ name: "toolchain", status: "warn", detail: note });
  }
  if (ctx && ctx.model.mcp.length > 0) {
    const writable = ctx.model.mcp.filter((s) => !s.readOnly);
    if (writable.length > 0) {
      checks.push({
        name: "mcp safety",
        status: "warn",
        detail: `${writable.length} server(s) are not read-only: ${writable.map((s) => s.name).join(", ")}`,
        hint: "An agent acting on untrusted issue or ticket text should not hold write-capable tools."
      });
    } else {
      checks.push({
        name: "mcp safety",
        status: "pass",
        detail: `${ctx.model.mcp.length} server(s), all read-only`
      });
    }
    const withLiterals = ctx.model.mcp.map((s) => ({ name: s.name, keys: literalEnvKeys(s.env) })).filter((s) => s.keys.length > 0);
    if (withLiterals.length > 0) {
      checks.push({
        name: "mcp secrets",
        status: "fail",
        detail: withLiterals.map((s) => `${s.name}: ${s.keys.join(", ")}`).join("; "),
        hint: 'Those values are copied into every generated MCP config. Use "${VAR}" and export the variable instead.'
      });
    } else {
      checks.push({ name: "mcp secrets", status: "pass", detail: "no literal values declared" });
    }
    for (const server of ctx.model.mcp) {
      if (server.transport !== "stdio" || !server.command) continue;
      const looksLocal = server.command.startsWith(".") || server.command.startsWith("/");
      if (looksLocal && !await exists2(path11.resolve(root, server.command))) {
        checks.push({
          name: `mcp: ${server.name}`,
          status: "fail",
          detail: `command not found: ${server.command}`
        });
      }
    }
  }
  const workflowDir = path11.join(root, ".github", "workflows");
  const workflowNames = await fs10.readdir(workflowDir).catch(() => []);
  for (const name of workflowNames.filter((n) => /\.ya?ml$/.test(n))) {
    const body = await fs10.readFile(path11.join(workflowDir, name), "utf8").catch(() => "");
    if (!body.includes(WORKFLOW_MARKER)) continue;
    const missing = WORKFLOW_FEATURES.filter((feature) => !body.includes(feature));
    if (missing.length === 0) {
      checks.push({ name: `workflow: ${name}`, status: "pass", detail: "up to date" });
      continue;
    }
    checks.push({
      name: `workflow: ${name}`,
      status: "warn",
      detail: `predates ${missing.join(", ")}`,
      hint: missing.includes("share-state") ? "Without share-state the review workflow cannot find the run it is meant to advance, and says nothing. Add it, or re-scaffold into a scratch directory and compare." : "Compare against a freshly scaffolded workflow."
    });
  }
  if (ctx) {
    for (const target of ctx.config.targets) {
      const compiler = COMPILERS[target];
      const result = compiler.compile(ctx);
      const missing = [];
      for (const f of result.files) {
        if (!await exists2(path11.resolve(root, f.path))) missing.push(f.path);
      }
      checks.push({
        name: compiler.displayName,
        status: missing.length === 0 ? "pass" : "warn",
        detail: missing.length === 0 ? `${result.files.length} artefact(s) present` : `${missing.length} missing: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}`,
        ...missing.length > 0 ? { hint: "Run `ctxmux sync`." } : {}
      });
    }
  }
  heading("Diagnostics");
  for (const check2 of checks) {
    const line = `${check2.name.padEnd(22)} ${check2.detail}`;
    if (check2.status === "pass") success(line);
    else if (check2.status === "warn") warn(line);
    else error(line);
    if (check2.hint) info("      " + c.dim(check2.hint));
  }
  const failed = checks.filter((c2) => c2.status === "fail").length;
  const warned = checks.filter((c2) => c2.status === "warn").length;
  info("");
  if (failed > 0) {
    error(`${failed} failure(s), ${warned} warning(s).`);
    return 1;
  }
  if (warned > 0) {
    warn(`${warned} warning(s), no failures.`);
    return 0;
  }
  success("All checks passed.");
  return 0;
}

// packages/cli/src/commands/map.ts
async function mapCommand(args) {
  const root = flagString(args, "root") ?? process.cwd();
  const budget = flagNumber(args, "budget", { default: 4e3, min: 100 });
  const symbols = flagString(args, "symbols")?.split(",").map((s) => s.trim()).filter(Boolean);
  const paths = flagString(args, "paths")?.split(",").map((s) => s.trim()).filter(Boolean);
  const noCache = flagBool(args, "no-cache");
  const showProfile = flagBool(args, "profile");
  const text = args.positionals.join(" ");
  if (!Number.isFinite(budget) || budget <= 0) {
    warn("--budget must be a positive number of tokens.");
    return 1;
  }
  if (showProfile) {
    const profile = await detectProfile(root);
    info(renderProfile(profile));
    return 0;
  }
  if (!text && !symbols && !paths) {
    warn("Nothing to search for.");
    info("");
    info('  ctxmux map "add a date formatting helper"');
    info('  ctxmux map --symbols "use*,*Selector" --budget 2000');
    info("  ctxmux map --profile");
    return 1;
  }
  const started = Date.now();
  const index = await buildIndex(root, { noCache });
  const indexMs = Date.now() - started;
  const result = buildMap(index, {
    ...text ? { text } : {},
    ...symbols ? { symbols } : {},
    ...paths ? { paths } : {},
    budget
  });
  info(result.text);
  heading("Index");
  bullet(`${index.files.length} file(s) indexed, ${index.skipped} skipped, ${indexMs}ms`);
  if (index.truncated) {
    warn(`The index stopped at the file ceiling, so this map covers only part of the repository.`);
    info("    " + c.dim("Raise it with --max-files, or narrow the map with --paths."));
  }
  bullet(`${result.totalCandidates} candidate(s) matched, ${result.files.length} rendered, ${result.omitted} omitted`);
  bullet(`~${result.estimatedTokens} tokens of ${budget} budget`);
  if (index.git.commitCounts.size === 0) {
    info("    " + c.dim("No git history available \u2014 recency and co-change ranking are inactive."));
  }
  return 0;
}

// packages/cli/src/commands/run.ts
import { promises as fs15 } from "node:fs";
import * as path17 from "node:path";

// packages/core/src/task.ts
var CRITERIA_SECTION = /^(?:acceptance criteria|acceptance|requirements?|done when|definition of done|expected behaviours?|expected behaviors?|expected results?|expected outcomes?|expected)\b/;
function sectionLabel(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const heading2 = /^#{1,6}\s+(.+)$/.exec(trimmed);
  if (heading2) return normaliseLabel(heading2[1]);
  const bold = /^\*\*(.+?)\*\*:?$/.exec(trimmed);
  if (bold) return normaliseLabel(bold[1]);
  if (trimmed.length <= 60 && /^[A-Za-z][A-Za-z /]*:$/.test(trimmed)) {
    return normaliseLabel(trimmed.slice(0, -1));
  }
  return null;
}
function normaliseLabel(text) {
  return text.toLowerCase().replace(/[*_`#]/g, "").replace(/:$/, "").trim();
}
function extractAcceptanceCriteria(body) {
  const lines = body.split("\n");
  const items = [];
  const prose = [];
  let inSection = false;
  for (const line of lines) {
    const label = sectionLabel(line);
    if (label !== null) {
      inSection = CRITERIA_SECTION.test(label);
      continue;
    }
    if (!inSection) continue;
    const item = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s*)?(.+)$/.exec(line);
    if (item) items.push(clean(item[1]));
    else if (line.trim()) prose.push(line.trim());
  }
  if (items.length > 0) return items;
  if (prose.length === 0) return [];
  return [clean(prose.join(" "))];
}
function clean(text) {
  return text.replace(/[*_]/g, "").trim();
}

// packages/core/src/machine.ts
function taskFingerprint(task) {
  return [
    task.title.trim(),
    task.body.trim(),
    task.acceptanceCriteria.map((c2) => c2.text.trim()).join("\0"),
    task.scope.allow.join(","),
    task.scope.deny.join(",")
  ].join("");
}
var TERMINAL = /* @__PURE__ */ new Set([
  "completed",
  "escalated",
  "failed",
  "rejected"
]);
var DEFAULT_POLICY = {
  maxFeedbackRounds: 2,
  maxAttempts: 2,
  selfCorrect: true
};
function createRun(task, policy = DEFAULT_POLICY) {
  return {
    id: `run-${task.id}`,
    task,
    state: "discovered",
    attempt: 0,
    feedbackRound: 0,
    policy,
    history: [],
    gateOutcomes: []
  };
}
function advance(run3, to, event, note) {
  return {
    ...run3,
    state: to,
    history: [...run3.history, { from: run3.state, to, event: event.type, ...note ? { note } : {} }]
  };
}
function summarizeGates(outcomes) {
  return outcomes.filter((o) => o.verdict !== "pass").map((o) => `- **${o.gate}**: ${o.reason ?? "failed"}${o.hint ? `
  ${o.hint}` : ""}`).join("\n");
}
function reduce(run3, event) {
  const ignore = { run: run3, effects: [], applied: false };
  if (TERMINAL.has(run3.state)) return ignore;
  if (event.type === "cancelled") {
    return {
      run: { ...advance(run3, "failed", event), terminalReason: event.reason },
      effects: [
        { type: "tracker_comment", body: `Run cancelled: ${event.reason}` },
        { type: "dispose_runner" },
        { type: "persist" }
      ],
      applied: true
    };
  }
  if (event.type === "escalated") {
    return {
      run: { ...advance(run3, "escalated", event), terminalReason: event.reason },
      effects: [
        { type: "tracker_transition", to: "blocked" },
        { type: "tracker_label", add: ["needs-human"], remove: [] },
        { type: "tracker_comment", body: `Escalated to a human: ${event.reason}` },
        { type: "notify", level: "warn", title: `Escalated: ${run3.task.title}`, body: event.reason },
        { type: "dispose_runner" },
        { type: "persist" }
      ],
      applied: true
    };
  }
  switch (run3.state) {
    // -----------------------------------------------------------------------
    case "discovered": {
      if (event.type === "preflight_passed") {
        return {
          run: {
            ...advance(run3, "ready", event),
            // Keep the passing outcomes too. Recording only failures means nothing downstream
            // can distinguish "the quality gate passed" from "the quality gate never ran" —
            // and a report that cannot tell those apart contradicts itself.
            gateOutcomes: event.outcomes ?? run3.gateOutcomes
          },
          effects: [
            { type: "tracker_transition", to: "in_progress" },
            { type: "tracker_assign" },
            { type: "dispatch_agent" },
            { type: "persist" }
          ],
          applied: true
        };
      }
      if (event.type === "preflight_failed") {
        const escalating = event.outcomes.some((o) => o.verdict === "escalate");
        if (escalating) {
          return reduce({ ...run3, gateOutcomes: event.outcomes }, {
            type: "escalated",
            reason: event.outcomes.find((o) => o.verdict === "escalate")?.reason ?? "gate escalation"
          });
        }
        return {
          run: {
            ...advance(run3, "rejected", event),
            gateOutcomes: event.outcomes,
            terminalReason: "preflight gates rejected the task"
          },
          effects: [
            { type: "tracker_label", add: ["needs-detail"], remove: [] },
            {
              type: "tracker_comment",
              body: `This task was not picked up automatically:

${summarizeGates(event.outcomes)}`
            },
            { type: "persist" }
          ],
          applied: true
        };
      }
      return ignore;
    }
    // -----------------------------------------------------------------------
    /*
     * The three states in which an agent owes us a result.
     *
     * They are handled together because the two archetypes reach a result differently. A
     * delegated agent is handed work and observed later, so `agent_started` is a real,
     * separately-observable moment. A driven agent's dispatch is a single synchronous call,
     * so its terminal event arrives with no intervening `started`. Requiring the delegated
     * shape from both would strand every driven run in `ready` forever.
     */
    case "ready":
    case "revising":
    case "working": {
      if (event.type === "resumed") {
        return {
          run: run3,
          effects: [
            { type: "dispatch_agent", ...run3.pendingFeedback ? { feedback: run3.pendingFeedback } : {} }
          ],
          applied: true
        };
      }
      if (event.type === "agent_started") {
        return {
          run: run3.state === "working" ? run3 : { ...advance(run3, "working", event), handleRef: event.handleRef },
          effects: [{ type: "persist" }],
          applied: true
        };
      }
      if (event.type === "agent_succeeded") {
        return {
          run: {
            ...advance(run3, "proposed", event),
            result: event.result,
            pendingFeedback: void 0
          },
          effects: [{ type: "run_verify_gates", result: event.result }, { type: "persist" }],
          applied: true
        };
      }
      if (event.type === "agent_refused") {
        return reduce(run3, { type: "escalated", reason: `Agent declined the task: ${event.reason}` });
      }
      if (event.type === "agent_failed" || event.type === "timed_out") {
        const reason = event.type === "timed_out" ? `timed out after ${event.afterMs}ms` : event.error;
        const next = { ...run3, attempt: run3.attempt + 1 };
        if (next.attempt >= run3.policy.maxAttempts) {
          return reduce(next, {
            type: "escalated",
            reason: `Agent failed ${next.attempt} time(s): ${reason}`
          });
        }
        const recovery = event.type === "agent_failed" ? event.recovery : void 0;
        const carry = recovery ?? run3.pendingFeedback;
        return {
          run: {
            ...advance(next, "ready", event, `attempt ${next.attempt} failed: ${reason}`),
            ...carry ? { pendingFeedback: carry } : {}
          },
          effects: [
            { type: "notify", level: "warn", title: `Retrying ${run3.task.id}`, body: reason },
            { type: "dispatch_agent", ...carry ? { feedback: carry } : {} },
            { type: "persist" }
          ],
          applied: true
        };
      }
      return ignore;
    }
    // -----------------------------------------------------------------------
    case "proposed": {
      if (event.type === "verify_passed") {
        return {
          run: {
            ...advance(run3, "in_review", event),
            gateOutcomes: event.outcomes ?? run3.gateOutcomes
          },
          effects: [
            { type: "mark_ready_for_review" },
            { type: "tracker_transition", to: "in_review" },
            {
              type: "tracker_comment",
              body: `Changes proposed by ${run3.result?.filesChanged.length ?? 0} file(s).

${run3.result?.summary ?? ""}`
            },
            { type: "persist" }
          ],
          applied: true
        };
      }
      if (event.type === "verify_failed") {
        const escalating = event.outcomes.some((o) => o.verdict === "escalate");
        const detail = summarizeGates(event.outcomes);
        const escalated = { ...run3, gateOutcomes: event.outcomes };
        if (escalating || !run3.policy.selfCorrect) {
          return reduce(escalated, { type: "escalated", reason: `Verification failed:
${detail}` });
        }
        const nextRound = run3.feedbackRound + 1;
        if (nextRound > run3.policy.maxFeedbackRounds) {
          return reduce(escalated, {
            type: "escalated",
            reason: `Verification still failing after ${run3.feedbackRound} correction round(s):
${detail}`
          });
        }
        const feedback = {
          round: nextRound,
          source: "verify-gates",
          body: `The following checks failed. Fix them without changing anything else:

${detail}`
        };
        return {
          run: {
            ...advance(run3, "revising", event),
            feedbackRound: nextRound,
            gateOutcomes: event.outcomes,
            pendingFeedback: feedback
          },
          effects: [{ type: "dispatch_agent", feedback }, { type: "persist" }],
          applied: true
        };
      }
      return ignore;
    }
    // -----------------------------------------------------------------------
    case "in_review": {
      if (event.type === "review_approved") {
        return {
          run: advance(run3, "completed", event),
          effects: [
            { type: "tracker_transition", to: "done" },
            { type: "notify", level: "info", title: `Completed: ${run3.task.title}`, body: run3.result?.summary ?? "" },
            { type: "dispose_runner" },
            { type: "persist" }
          ],
          applied: true
        };
      }
      if (event.type === "review_changes_requested") {
        const nextRound = run3.feedbackRound + 1;
        if (nextRound > run3.policy.maxFeedbackRounds) {
          return reduce(run3, {
            type: "escalated",
            reason: `${run3.feedbackRound} review round(s) without resolution`
          });
        }
        const revision = { ...event.feedback, round: nextRound };
        return {
          run: { ...advance(run3, "revising", event), feedbackRound: nextRound, pendingFeedback: revision },
          effects: [
            { type: "tracker_transition", to: "in_progress" },
            { type: "dispatch_agent", feedback: revision },
            { type: "persist" }
          ],
          applied: true
        };
      }
      return ignore;
    }
    default:
      return ignore;
  }
}

// packages/core/src/glob.ts
function escapeLiteral(ch) {
  return /[.+^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch;
}
function globToRegExp(pattern) {
  let out = "^";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        if (pattern[i + 2] === "/") {
          out += "(?:[^/]*\\/)*";
          i += 3;
        } else {
          out += ".*";
          i += 2;
        }
      } else {
        out += "[^/]*";
        i += 1;
      }
      continue;
    }
    if (ch === "?") {
      out += "[^/]";
      i += 1;
      continue;
    }
    if (ch === "{") {
      const close = pattern.indexOf("}", i);
      if (close === -1) {
        out += "\\{";
        i += 1;
        continue;
      }
      const alternatives = pattern.slice(i + 1, close).split(",").map((alt) => alt.split("").map(escapeLiteral).join(""));
      out += `(?:${alternatives.join("|")})`;
      i = close + 1;
      continue;
    }
    out += escapeLiteral(ch);
    i += 1;
  }
  return new RegExp(`${out}$`);
}
function matchGlob(pattern, filePath) {
  return globToRegExp(pattern).test(filePath);
}
function globsOverlap(a, b) {
  const left = a.split("/");
  const right = b.split("/");
  const wild = (segment) => /[*?{[]/.test(segment);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const l = left[i];
    const r = right[i];
    if (l === "**" || r === "**") return true;
    if (wild(l) && wild(r)) continue;
    if (wild(l)) {
      if (!matchGlob(l, r)) return false;
      continue;
    }
    if (wild(r)) {
      if (!matchGlob(r, l)) return false;
      continue;
    }
    if (l !== r) return false;
  }
  return left.length === right.length;
}

// packages/core/src/gates.ts
var pass = (gate) => ({ gate, verdict: "pass" });
var reject = (gate, reason, hint) => ({
  gate,
  verdict: "reject",
  reason,
  ...hint ? { hint } : {}
});
function readiness(opts = {}) {
  const minChars = opts.minBodyChars ?? 80;
  const requireAC = opts.requireAcceptanceCriteria ?? true;
  return {
    name: "readiness",
    preflight({ task }) {
      const body = task.body.trim();
      const hasAC = task.acceptanceCriteria.length > 0;
      if (hasAC && body.length >= 40) return pass("readiness");
      if (body.length < minChars && !hasAC) {
        return reject(
          "readiness",
          `description is ${body.length} characters and there are no acceptance criteria`,
          'Describe the expected behaviour, or add an "Acceptance criteria" section listing what must be true when this is done.'
        );
      }
      if (requireAC && !hasAC) {
        return reject(
          "readiness",
          "no acceptance criteria found",
          'Add an "Acceptance criteria" section. Without one there is nothing to verify the change against.'
        );
      }
      return pass("readiness");
    }
  };
}
function complexity(opts = {}) {
  const maxScore = opts.maxScore ?? 3;
  return {
    name: "complexity",
    preflight({ task }) {
      let score = 0;
      const reasons = [];
      const text = `${task.title} ${task.body}`.toLowerCase();
      if (task.estimate && task.estimate >= 5) {
        score += 2;
        reasons.push(`estimate of ${task.estimate}`);
      }
      for (const word of ["refactor", "migrat", "rewrite", "redesign", "overhaul"]) {
        if (text.includes(word)) {
          score += 2;
          reasons.push(`mentions "${word}"`);
          break;
        }
      }
      if (task.acceptanceCriteria.length > 6) {
        score += 1;
        reasons.push(`${task.acceptanceCriteria.length} acceptance criteria`);
      }
      if (task.body.length > 4e3) {
        score += 1;
        reasons.push("very long description");
      }
      return score > maxScore ? reject(
        "complexity",
        `complexity score ${score} exceeds ${maxScore} (${reasons.join(", ")})`,
        "Split this into smaller tasks. Large agent changes are harder to review than to write."
      ) : pass("complexity");
    }
  };
}
function pathScope(opts = {}) {
  const defaultDeny = opts.defaultDeny ?? [];
  return {
    name: "path-scope",
    verify({ task, result }) {
      const allow = task.scope.allow;
      const deny = [...task.scope.deny, ...defaultDeny];
      const violations = [];
      for (const file of result.filesChanged) {
        if (deny.some((p) => matchGlob(p, file))) {
          violations.push(`${file} (explicitly out of scope)`);
          continue;
        }
        if (allow.length > 0 && !allow.some((p) => matchGlob(p, file))) {
          violations.push(`${file} (outside the allowed paths)`);
        }
      }
      if (violations.length > 0) {
        return reject(
          "path-scope",
          `${violations.length} file(s) changed outside the task's scope:
  ${violations.join("\n  ")}`,
          `Revert those files. Allowed: ${allow.length ? allow.join(", ") : "anything not denied"}. Denied: ${deny.join(", ") || "none"}.`
        );
      }
      const maxFiles = task.scope.maxFiles;
      if (maxFiles !== void 0 && result.filesChanged.length > maxFiles) {
        return reject(
          "path-scope",
          `${result.filesChanged.length} files changed, limit is ${maxFiles}`,
          "Reduce the change, or split the task."
        );
      }
      return pass("path-scope");
    }
  };
}
function qualityGate(opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 10 * 6e4;
  return {
    name: "quality-gate",
    async verify({ task, runner }) {
      if (task.qualityGate.length === 0) {
        return { gate: "quality-gate", verdict: "pass", reason: "no commands configured" };
      }
      for (const command of task.qualityGate) {
        const parts = command.split(/\s+/).filter(Boolean);
        const bin = parts[0];
        if (!bin) continue;
        const res = await runner.exec(bin, parts.slice(1), { timeoutMs });
        if (res.code !== 0) {
          const output = `${res.stdout}
${res.stderr}`.trim().split("\n").slice(-40).join("\n");
          return reject(
            "quality-gate",
            `\`${command}\` failed${res.timedOut ? " (timed out)" : ` with exit code ${res.code}`}`,
            `Output:
\`\`\`
${output}
\`\`\``
          );
        }
      }
      return pass("quality-gate");
    }
  };
}
function producedChanges() {
  return {
    name: "produced-changes",
    verify({ result }) {
      return result.filesChanged.length > 0 ? pass("produced-changes") : reject(
        "produced-changes",
        "the agent reported success but changed no files",
        "Either the task was already satisfied, or it was misunderstood. A human should look."
      );
    }
  };
}
function testIntegrity(opts = {}) {
  const testGlobs = opts.testGlobs ?? [
    "**/*.test.*",
    "**/*.spec.*",
    "**/test/**",
    "**/tests/**",
    "**/__tests__/**"
  ];
  return {
    name: "test-integrity",
    async verify({ result, runner }) {
      const touchedTests = result.filesChanged.filter((f) => testGlobs.some((g) => matchGlob(g, f)));
      if (touchedTests.length === 0) return pass("test-integrity");
      const diff = result.diff || await runner.diff();
      const lines = diff.split("\n");
      const suspicious = [];
      const normalise = (body) => body.trim().replace(/\s+/g, " ");
      const added = new Set(
        lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => normalise(l.slice(1)))
      );
      for (const line of lines) {
        if (line.startsWith("-") && !line.startsWith("---")) {
          const body = line.slice(1);
          if (added.has(normalise(body))) continue;
          if (/\b(expect|assert|should)\b/.test(body)) suspicious.push(`removed assertion: ${body.trim()}`);
          else if (/\b(it|test|describe)\s*\(/.test(body)) suspicious.push(`removed test: ${body.trim()}`);
        } else if (line.startsWith("+") && !line.startsWith("+++")) {
          const body = line.slice(1);
          if (/\b(?:(?:it|test|describe)\.(?:skip|only|todo|failing)\b|x(?:it|test|describe)\s*\()/.test(body)) {
            suspicious.push(`weakened test: ${body.trim()}`);
          }
        }
      }
      if (suspicious.length > 0) {
        return {
          gate: "test-integrity",
          verdict: "escalate",
          reason: `test files were weakened rather than extended:
  ${suspicious.slice(0, 10).join("\n  ")}`,
          hint: "A failing test usually means the implementation is wrong. A human should decide whether this change was legitimate."
        };
      }
      return pass("test-integrity");
    }
  };
}
async function runPreflight(gates, ctx) {
  const outcomes = [];
  for (const gate of gates) {
    if (!gate.preflight) continue;
    outcomes.push(await gate.preflight(ctx));
  }
  return outcomes;
}
async function runVerify(gates, ctx) {
  const outcomes = [];
  for (const gate of gates) {
    if (!gate.verify) continue;
    outcomes.push(await gate.verify(ctx));
  }
  return outcomes;
}
function allPassed(outcomes) {
  return outcomes.every((o) => o.verdict === "pass");
}
var DEFAULT_DENY = [
  "**/package.json",
  "**/pnpm-lock.yaml",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/bun.lockb",
  ".github/workflows/**",
  "**/tsconfig.json",
  "**/tsconfig.*.json",
  "**/*.config.{ts,js,mjs,cjs}",
  "**/.env",
  "**/.env.*"
];

// packages/core/src/gates-minimal.ts
var pass2 = (gate) => ({ gate, verdict: "pass" });
var reject2 = (gate, reason, hint) => ({
  gate,
  verdict: "reject",
  reason,
  ...hint ? { hint } : {}
});
function addedLines(diff) {
  const out = [];
  let current = "";
  for (const line of diff.split("\n")) {
    const header2 = /^\+\+\+ b\/(.+)$/.exec(line);
    if (header2) {
      current = header2[1];
      continue;
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      out.push({ file: current, text: line.slice(1) });
    }
  }
  return out;
}
function noUnrequestedDependencies(opts = {}) {
  const manifests = opts.manifests ?? [
    "package.json",
    "**/package.json",
    "requirements.txt",
    "pyproject.toml",
    "go.mod",
    "Cargo.toml",
    "Gemfile",
    "composer.json"
  ];
  return {
    name: "no-unrequested-dependencies",
    async verify({ task, result, runner }) {
      const touched = result.filesChanged.filter((f) => manifests.some((m) => matchGlob(m, f)));
      if (touched.length === 0) return pass2("no-unrequested-dependencies");
      const diff = result.diff || await runner.diff().catch(() => "");
      if (!diff) {
        return {
          gate: "no-unrequested-dependencies",
          verdict: "reject",
          reason: `${touched.join(", ")} changed, and no diff was available to check what was added`,
          hint: "Review the manifest change by hand."
        };
      }
      const taskText = `${task.title} ${task.body}`.toLowerCase();
      const added = [];
      for (const line of addedLines(diff)) {
        if (!manifests.some((m) => matchGlob(m, line.file))) continue;
        const json = /^\s*"([^"]+)"\s*:\s*"[^"]*"/.exec(line.text);
        const other = /^\s*([A-Za-z0-9@._/-]+)\s*[=><~]{1,2}/.exec(line.text);
        const name = json?.[1] ?? other?.[1];
        if (!name) continue;
        if (["name", "version", "description", "license", "main", "type", "author"].includes(name)) continue;
        if (taskText.includes(name.toLowerCase().replace(/^@[^/]+\//, ""))) continue;
        added.push(name);
      }
      if (added.length === 0) return pass2("no-unrequested-dependencies");
      return reject2(
        "no-unrequested-dependencies",
        `${added.length} dependency/dependencies added that the task did not ask for: ${added.join(", ")}`,
        "Use what is already installed, or the standard library. If one of these is genuinely required, say why in the pull request description so a human can agree."
      );
    }
  };
}
function noDuplicateSymbols(opts) {
  return {
    name: "no-duplicate-symbols",
    async verify({ result, runner }) {
      const diff = result.diff || await runner.diff().catch(() => "");
      if (!diff) return pass2("no-duplicate-symbols");
      const declared = [];
      for (const line of addedLines(diff)) {
        const match = /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(line.text) ?? /^\s*export\s+(?:const|class|interface|type)\s+([A-Za-z_$][\w$]*)/.exec(line.text) ?? /^\s*(?:pub\s+)?fn\s+([a-z_][\w]*)/.exec(line.text) ?? /^\s*def\s+([a-z_][\w]*)/.exec(line.text);
        if (match?.[1]) declared.push({ name: match[1], file: line.file });
      }
      if (declared.length === 0) return pass2("no-duplicate-symbols");
      const index = await opts.existing();
      const changed = new Set(result.filesChanged);
      const collisions = [];
      for (const added of declared) {
        const clash = index.find(
          (e) => e.name.toLowerCase() === added.name.toLowerCase() && // Not the same file — redeclaring within the file it edited is normal.
          e.file !== added.file && !changed.has(e.file)
        );
        if (clash) collisions.push(`\`${added.name}\` in ${added.file} already exists in ${clash.file}`);
      }
      if (collisions.length === 0) return pass2("no-duplicate-symbols");
      return reject2(
        "no-duplicate-symbols",
        `${collisions.length} newly-added symbol(s) already exist elsewhere:
  ${collisions.join("\n  ")}`,
        "Reuse the existing one, or extend it. If the new one genuinely differs, give it a name that says how."
      );
    }
  };
}
function noSpeculativeAbstraction(opts = {}) {
  const minImplementers = opts.minImplementers ?? 2;
  return {
    name: "no-speculative-abstraction",
    async verify({ task, result, runner }) {
      const diff = result.diff || await runner.diff().catch(() => "");
      if (!diff) return pass2("no-speculative-abstraction");
      const taskText = `${task.title} ${task.body}`.toLowerCase();
      const REQUESTED = /\b(?:interfaces?|abstract(?:ion|ions|ing)?|plug-?ins?|adapters?|extensib(?:le|ility)|pluggab(?:le|ility)|strategy pattern)\b/;
      if (REQUESTED.test(taskText)) {
        return pass2("no-speculative-abstraction");
      }
      const added = addedLines(diff);
      const interfaces = /* @__PURE__ */ new Map();
      for (const line of added) {
        const match = /^\s*export\s+(?:interface|abstract\s+class)\s+([A-Za-z_$][\w$]*)/.exec(line.text);
        if (match?.[1]) interfaces.set(match[1], line.file);
      }
      if (interfaces.size === 0) return pass2("no-speculative-abstraction");
      const speculative = [];
      for (const [name, file] of interfaces) {
        const implementers = added.filter(
          (l) => new RegExp(`\\b(?:implements|extends|:)\\s+${name}\\b`).test(l.text)
        ).length;
        if (implementers < minImplementers) {
          speculative.push(`\`${name}\` in ${file} (${implementers} implementer(s))`);
        }
      }
      if (speculative.length === 0) return pass2("no-speculative-abstraction");
      return reject2(
        "no-speculative-abstraction",
        `${speculative.length} abstraction(s) introduced with fewer than ${minImplementers} users: ${speculative.join(", ")}`,
        "An interface with one implementation is a layer added on speculation. Use the concrete type; introduce the interface when a second implementation actually arrives."
      );
    }
  };
}

// packages/core/src/fsx.ts
import { promises as fs11 } from "node:fs";
import * as path12 from "node:path";
var sequence2 = 0;
async function writeFileAtomic2(file, content) {
  const dir = path12.dirname(file);
  await fs11.mkdir(dir, { recursive: true });
  const tmp = path12.join(dir, `.${path12.basename(file)}.ctxmux-${process.pid}-${sequence2++}.tmp`);
  try {
    await fs11.writeFile(tmp, content, "utf8");
    await fs11.rename(tmp, file);
  } catch (err) {
    await fs11.rm(tmp, { force: true }).catch(() => {
    });
    throw err;
  }
}

// packages/core/src/store.ts
import { randomUUID } from "node:crypto";
import { createHash as createHash3 } from "node:crypto";
import { promises as fs12 } from "node:fs";
import * as path13 from "node:path";
var MemoryStore = class {
  runs = /* @__PURE__ */ new Map();
  applied = /* @__PURE__ */ new Set();
  leases = /* @__PURE__ */ new Map();
  async load(runId) {
    return this.runs.get(runId) ?? null;
  }
  async save(runId, value) {
    this.runs.set(runId, value);
  }
  async list() {
    return [...this.runs.keys()];
  }
  async forgetApplied(runId) {
    let removed = 0;
    for (const key of [...this.applied]) {
      if (key.startsWith(`${runId}:`)) {
        this.applied.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
  async applyOnce(key, fn) {
    if (this.applied.has(key)) return false;
    this.applied.add(key);
    await fn();
    return true;
  }
  async acquireLease(runId, ttlMs) {
    const now = Date.now();
    const existing = this.leases.get(runId);
    if (existing !== void 0 && existing > now) {
      return { held: false, release: async () => {
      } };
    }
    this.leases.set(runId, now + ttlMs);
    return {
      held: true,
      release: async () => {
        this.leases.delete(runId);
      }
    };
  }
};
var FileStore = class {
  constructor(dir) {
    this.dir = dir;
  }
  dir;
  runPath(runId) {
    return path13.join(this.dir, "runs", `${encodeURIComponent(runId)}.json`);
  }
  /** Legacy single-file record, still read so an existing installation is not re-applied. */
  legacyAppliedPath() {
    return path13.join(this.dir, "applied.json");
  }
  /**
   * One marker file per key.
   *
   * Keys contain path separators and arrows, so they are hashed rather than used as filenames.
   * The key itself is written inside, which keeps `ls` unhelpful but a `grep` conclusive.
   */
  appliedMarkerPath(key) {
    const digest2 = createHash3("sha256").update(key).digest("hex").slice(0, 32);
    return path13.join(this.dir, "applied", `${digest2}.key`);
  }
  leasePath(runId) {
    return path13.join(this.dir, "leases", `${encodeURIComponent(runId)}.lease`);
  }
  async load(runId) {
    try {
      return JSON.parse(await fs12.readFile(this.runPath(runId), "utf8"));
    } catch {
      return null;
    }
  }
  async save(runId, value) {
    await writeFileAtomic2(this.runPath(runId), JSON.stringify(value, null, 2));
  }
  async list() {
    try {
      const files = await fs12.readdir(path13.join(this.dir, "runs"));
      return files.filter((f) => f.endsWith(".json")).map((f) => decodeURIComponent(f.replace(/\.json$/, "")));
    } catch {
      return [];
    }
  }
  async legacyApplied() {
    try {
      return new Set(JSON.parse(await fs12.readFile(this.legacyAppliedPath(), "utf8")));
    } catch {
      return /* @__PURE__ */ new Set();
    }
  }
  /**
   * Claim a key, exactly once, across processes.
   *
   * Exclusive file creation rather than a read-modify-write of one JSON file. The shared-file
   * version had two failure modes that both end in a duplicated side effect: two workers that
   * read before either writes lose one of the entries, and a write torn by a crash leaves
   * unparseable JSON, which reads back as *nothing has been applied* — so every comment, label
   * and transition replays.
   *
   * Marking before running is deliberate and unchanged: a crash midway through a non-idempotent
   * effect must not let a retry perform it twice.
   */
  async forgetApplied(runId) {
    const dir = path13.join(this.dir, "applied");
    let names;
    try {
      names = await fs12.readdir(dir);
    } catch {
      return 0;
    }
    const prefix = `${runId}:`;
    let removed = 0;
    for (const name of names) {
      const file = path13.join(dir, name);
      const contents = await fs12.readFile(file, "utf8").catch(() => "");
      if (contents.startsWith(prefix)) {
        await fs12.rm(file, { force: true }).catch(() => {
        });
        removed += 1;
      }
    }
    return removed;
  }
  async applyOnce(key, fn) {
    const marker = this.appliedMarkerPath(key);
    await fs12.mkdir(path13.dirname(marker), { recursive: true });
    try {
      await fs12.writeFile(marker, key, { flag: "wx" });
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      return false;
    }
    if ((await this.legacyApplied()).has(key)) return false;
    await fn();
    return true;
  }
  /**
   * Take a lease, or report that someone else holds it.
   *
   * Each lease carries an owner token, which answers the two questions a bare expiry cannot.
   *
   * Taking over an expired lease is not atomic — two processes can both find it expired and
   * both write. So the winner is decided by *reading back*: whoever's token survives holds it.
   * If neither does, both stand down and the next attempt takes it, which is the safe
   * direction for that race to fail in.
   *
   * And release only removes a lease this process still owns. Deleting unconditionally means a
   * worker whose lease expired mid-run deletes its successor's on the way out, leaving the run
   * unprotected while two processes work in it.
   */
  async acquireLease(runId, ttlMs) {
    const p = this.leasePath(runId);
    await fs12.mkdir(path13.dirname(p), { recursive: true });
    const owner = `${process.pid}-${randomUUID()}`;
    const record = () => JSON.stringify({ owner, expires: Date.now() + ttlMs });
    const release = async () => {
      const current = await readLease(p);
      if (current?.owner === owner) await fs12.rm(p, { force: true });
    };
    const notHeld = { held: false, release: async () => {
    } };
    try {
      await fs12.writeFile(p, record(), { flag: "wx" });
      return { held: true, release };
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
    const existing = await readLease(p);
    if (!existing || existing.expires >= Date.now()) return notHeld;
    await fs12.writeFile(p, record(), "utf8");
    const settled = await readLease(p);
    return settled?.owner === owner ? { held: true, release } : notHeld;
  }
};
async function readLease(p) {
  let raw;
  try {
    raw = await fs12.readFile(p, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.owner === "string" && typeof parsed.expires === "number") {
      return { owner: parsed.owner, expires: parsed.expires };
    }
  } catch {
  }
  const expires = Number(raw);
  return Number.isFinite(expires) ? { owner: "", expires } : null;
}

// packages/core/src/events.ts
var EventBus = class {
  listeners = [];
  on(listener) {
    this.listeners.push(listener);
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }
  emit(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
      }
    }
  }
};

// packages/core/src/engine.ts
var Engine = class {
  constructor(opts) {
    this.opts = opts;
    this.bus = opts.bus ?? new EventBus();
  }
  opts;
  bus;
  on(listener) {
    return this.bus.on(listener);
  }
  /**
   * Drive a task to a terminal state.
   *
   * The lease is held for the whole run rather than per transition. A run owns a runner and,
   * when isolated, a git worktree; letting a second process interleave transitions against
   * the same working directory would corrupt both.
   */
  async run(task, opts = {}) {
    const existing = await this.opts.store.load(`run-${task.id}`);
    const supersededByEdit = existing !== null && TERMINAL.has(existing.state) && taskFingerprint(existing.task) !== taskFingerprint(task);
    let run3 = existing !== null && !supersededByEdit ? existing : createRun(task, this.opts.policy ?? DEFAULT_POLICY);
    if (supersededByEdit) {
      const forgotten = await this.opts.store.forgetApplied(`run-${task.id}`);
      this.bus.emit({
        type: "log",
        level: "info",
        message: `${task.id} has changed since it was ${existing.state}; starting a fresh run` + (forgotten > 0 ? ` (${forgotten} recorded effect(s) reset)` : "")
      });
    }
    if (TERMINAL.has(run3.state)) {
      this.bus.emit({
        type: "log",
        level: "warn",
        message: `${run3.id} already finished (${run3.state}) and the task is unchanged, so nothing was re-evaluated. Change the task, or delete .ctxmux/state/runs/${run3.id}.json to start over.`
      });
      return run3;
    }
    const lease = await this.opts.store.acquireLease(run3.id, this.opts.leaseTtlMs ?? 30 * 6e4);
    if (!lease.held) {
      this.bus.emit({
        type: "log",
        level: "warn",
        message: `${run3.id} is already being processed by another worker`
      });
      return run3;
    }
    this.bus.emit({ type: "run:started", runId: run3.id, taskId: task.id, title: task.title });
    try {
      let pending = run3.state === "discovered" ? await this.preflight(run3, opts.inFlight ?? 0) : { type: "resumed" };
      while (pending !== null) {
        if (this.opts.signal?.aborted) {
          pending = { type: "cancelled", reason: "aborted by caller" };
        }
        const before = run3;
        const { run: next, effects, applied } = reduce(run3, pending);
        run3 = next;
        if (applied) {
          const last = run3.history[run3.history.length - 1];
          if (last) {
            this.bus.emit({
              type: "run:state",
              runId: run3.id,
              from: last.from,
              to: last.to,
              via: last.event
            });
          }
        }
        pending = await this.executeEffects(run3, effects, before);
        if (TERMINAL.has(run3.state)) break;
        if (pending === null && run3.state === "working" && this.opts.agent?.kind === "delegated" && this.opts.waitForDelegated !== false && !this.opts.dryRun) {
          pending = await this.observeDelegated(this.opts.agent, run3);
        }
      }
      if (!this.opts.dryRun) await this.opts.store.save(run3.id, run3);
      this.bus.emit({
        type: "run:finished",
        runId: run3.id,
        state: run3.state,
        ...run3.terminalReason ? { reason: run3.terminalReason } : {}
      });
      return run3;
    } finally {
      await lease.release();
    }
  }
  async preflight(run3, inFlight) {
    const outcomes = await runPreflight(this.opts.gates, { task: run3.task, inFlight });
    for (const outcome of outcomes) {
      this.bus.emit({ type: "gate:result", runId: run3.id, phase: "preflight", outcome });
    }
    return allPassed(outcomes) ? { type: "preflight_passed", outcomes } : { type: "preflight_failed", outcomes };
  }
  /**
   * Execute the effects of one transition.
   *
   * Returns the next event to feed back, when an effect produces one. Only agent dispatch and
   * verification do; everything else is a side effect with no consequence for the machine.
   */
  async executeEffects(run3, effects, before) {
    let nextEvent = null;
    for (const effect of effects) {
      const key = `${run3.id}:${before.state}->${run3.state}:${run3.attempt}.${run3.feedbackRound}:${effect.type}`;
      this.bus.emit({ type: "run:effect", runId: run3.id, effect: effect.type });
      switch (effect.type) {
        case "persist":
          if (!this.opts.dryRun) await this.opts.store.save(run3.id, run3);
          break;
        case "tracker_transition":
          await this.once(key, async () => {
            if (this.opts.dryRun) return;
            await this.opts.tracker?.transition(run3.task.origin.id, effect.to);
          });
          break;
        case "mark_ready_for_review":
          await this.once(key, async () => {
            if (this.opts.dryRun) return;
            const agent = this.opts.agent;
            if (agent?.kind !== "delegated" || !agent.markReady || !run3.handleRef) return;
            const url = await agent.markReady({ ref: run3.handleRef, agentId: agent.id });
            if (url) {
              this.bus.emit({ type: "log", level: "info", message: `marked ready for review: ${url}` });
            }
          });
          break;
        case "tracker_assign":
          await this.once(key, async () => {
            if (this.opts.dryRun) return;
            await this.opts.tracker?.assignToSelf?.(run3.task.origin.id);
          });
          break;
        case "tracker_comment":
          await this.once(key, async () => {
            if (this.opts.dryRun) return;
            await this.opts.tracker?.comment(run3.task.origin.id, effect.body);
          });
          break;
        case "tracker_label":
          await this.once(key, async () => {
            if (this.opts.dryRun) return;
            await this.opts.tracker?.setLabels(run3.task.origin.id, effect.add, effect.remove);
          });
          break;
        case "notify":
          await this.once(key, async () => {
            if (this.opts.dryRun) return;
            for (const n of this.opts.notifiers ?? []) {
              await n.send({ level: effect.level, title: effect.title, body: effect.body, runId: run3.id });
            }
          });
          break;
        case "dispatch_agent": {
          nextEvent = await this.dispatch(run3, effect.feedback);
          break;
        }
        case "run_verify_gates": {
          if (!this.opts.runner) {
            nextEvent = {
              type: "verify_failed",
              outcomes: [
                {
                  gate: "runner",
                  verdict: "escalate",
                  reason: "no runner is configured, so the change could not be verified",
                  hint: "Configure `runner` on the engine, or verify this change by hand."
                }
              ]
            };
            break;
          }
          let verifyIn = this.opts.runner;
          if (this.opts.verifyRunner) {
            let resolved = null;
            let failure = null;
            try {
              resolved = await this.opts.verifyRunner(effect.result);
            } catch (err) {
              failure = err.message;
            }
            if (!resolved) {
              nextEvent = {
                type: "verify_failed",
                outcomes: [
                  {
                    gate: "verify-workspace",
                    verdict: "escalate",
                    reason: `the change could not be prepared for verification${failure ? `: ${failure}` : ""}`,
                    hint: "Nothing was checked. Review this change by hand rather than treating it as verified."
                  }
                ]
              };
              break;
            }
            verifyIn = resolved;
          }
          const outcomes = await runVerify(this.opts.gates, {
            task: run3.task,
            result: effect.result,
            runner: verifyIn
          });
          for (const outcome of outcomes) {
            this.bus.emit({ type: "gate:result", runId: run3.id, phase: "verify", outcome });
          }
          nextEvent = allPassed(outcomes) ? { type: "verify_passed", outcomes } : { type: "verify_failed", outcomes };
          break;
        }
        case "dispose_runner":
          break;
      }
    }
    return nextEvent;
  }
  async once(key, fn) {
    return this.opts.store.applyOnce(key, fn);
  }
  async dispatch(run3, feedback) {
    const agent = this.opts.agent;
    if (!agent) {
      return {
        type: "agent_failed",
        error: "this run needs an agent, but the engine was created without one. Configure `agent` if you intend to dispatch work, not only record events."
      };
    }
    const prompt = await this.opts.renderPrompt(run3.task, feedback);
    if (agent.kind === "delegated") {
      return this.dispatchDelegated(agent, run3, prompt, feedback);
    }
    const driven = agent;
    const runner = this.opts.runner;
    if (!runner) {
      return {
        type: "agent_failed",
        error: `${driven.displayName} runs in a sandbox this engine provides, but no runner is configured. Set \`runner\` on the engine.`
      };
    }
    this.bus.emit({
      type: "agent:dispatched",
      runId: run3.id,
      agentId: driven.id,
      round: run3.feedbackRound
    });
    if (this.opts.dryRun) {
      this.bus.emit({
        type: "agent:progress",
        runId: run3.id,
        message: `would dispatch ${driven.id} with a ${prompt.length}-character prompt`
      });
      this.bus.emit({ type: "log", level: "info", message: `--- prompt preview ---
${prompt}` });
      return null;
    }
    try {
      const { result, handle } = await driven.run({
        task: run3.task,
        prompt,
        runner,
        ...feedback ? { feedback } : {},
        ...run3.handleRef ? { resumeFrom: { ref: run3.handleRef, agentId: driven.id } } : {},
        ...this.opts.signal ? { signal: this.opts.signal } : {}
      });
      this.bus.emit({
        type: "agent:finished",
        runId: run3.id,
        status: result.status,
        filesChanged: result.filesChanged.length
      });
      run3.handleRef = handle.ref;
      if (result.status === "refused") {
        return { type: "agent_refused", reason: result.error ?? result.summary };
      }
      if (result.status === "failed") {
        return {
          type: "agent_failed",
          error: result.error ?? "agent reported failure",
          ...result.recovery ? { recovery: result.recovery } : {}
        };
      }
      return { type: "agent_succeeded", result };
    } catch (err) {
      return { type: "agent_failed", error: err.message };
    }
  }
  /**
   * Hand work to a vendor's cloud.
   *
   * A revision round is a `nudge` on the existing handle rather than a fresh delegation:
   * delegating again would create a second artefact, and the vendor would work on the task
   * twice in parallel.
   */
  async dispatchDelegated(agent, run3, prompt, feedback) {
    this.bus.emit({
      type: "agent:dispatched",
      runId: run3.id,
      agentId: agent.id,
      round: run3.feedbackRound
    });
    if (this.opts.dryRun) {
      this.bus.emit({
        type: "agent:progress",
        runId: run3.id,
        message: `would delegate to ${agent.id} with a ${prompt.length}-character artefact`
      });
      this.bus.emit({ type: "log", level: "info", message: `--- prompt preview ---
${prompt}` });
      return null;
    }
    try {
      if (feedback && run3.handleRef) {
        await agent.nudge({ ref: run3.handleRef, agentId: agent.id }, feedback);
        return { type: "agent_started", handleRef: run3.handleRef };
      }
      const handle = await agent.delegate({ task: run3.task, prompt });
      run3.handleRef = handle.ref;
      return { type: "agent_started", handleRef: handle.ref };
    } catch (err) {
      return { type: "agent_failed", error: err.message };
    }
  }
  /**
   * Poll a delegated agent until it produces a result.
   *
   * Backs off up to the adapter's own interval, because vendors differ by orders of magnitude
   * in how long they take — polling a cloud agent every second for twenty minutes is rude to
   * the API and tells you nothing you would not learn a minute later.
   */
  async observeDelegated(agent, run3) {
    const timeoutMs = this.opts.delegatedTimeoutMs ?? 45 * 6e4;
    const maxInterval = agent.pollIntervalMs ?? 2e4;
    const started = Date.now();
    let interval = Math.min(2e3, maxInterval);
    let observations = 0;
    while (Date.now() - started < timeoutMs) {
      if (this.opts.signal?.aborted) {
        return { type: "cancelled", reason: "aborted while waiting for the agent" };
      }
      await new Promise((resolve17) => setTimeout(resolve17, interval));
      interval = Math.min(Math.round(interval * 1.6), maxInterval);
      observations += 1;
      let result;
      try {
        result = await agent.observe({ ref: run3.handleRef ?? "", agentId: agent.id });
      } catch (err) {
        this.bus.emit({
          type: "log",
          level: "warn",
          message: `observation ${observations} failed: ${err.message}`
        });
        continue;
      }
      if (!result) {
        this.bus.emit({
          type: "agent:progress",
          runId: run3.id,
          message: `still working (${Math.round((Date.now() - started) / 1e3)}s)`
        });
        continue;
      }
      this.bus.emit({
        type: "agent:finished",
        runId: run3.id,
        status: result.status,
        filesChanged: result.filesChanged.length
      });
      if (result.status === "refused") {
        return { type: "agent_refused", reason: result.error ?? result.summary };
      }
      if (result.status === "failed") {
        return {
          type: "agent_failed",
          error: result.error ?? "agent reported failure",
          ...result.recovery ? { recovery: result.recovery } : {}
        };
      }
      return { type: "agent_succeeded", result };
    }
    return { type: "timed_out", afterMs: Date.now() - started };
  }
  /**
   * Feed an external event — a human review, a webhook — into an existing run.
   *
   * Returns whether the event was actually applied. Returning the unchanged run on its own
   * would let a caller report success when another worker held the lease and nothing happened,
   * which is the kind of silent no-op that makes automation impossible to trust.
   */
  async submit(runId, event) {
    const stored = await this.opts.store.load(runId);
    if (!stored) return { run: null, applied: false, reason: `no run named "${runId}"` };
    const dispatches = reduce(stored, event).effects.some((e) => e.type === "dispatch_agent");
    const ttl = dispatches ? this.opts.leaseTtlMs ?? 30 * 6e4 : this.opts.submitLeaseTtlMs ?? 6e4;
    const lease = await this.opts.store.acquireLease(runId, ttl);
    if (!lease.held) {
      return {
        run: stored,
        applied: false,
        reason: "another worker is processing this run; the event was not applied"
      };
    }
    try {
      let run3 = stored;
      let pending = event;
      let applied = false;
      while (pending !== null) {
        const before = run3;
        const { run: next, effects, applied: didApply } = reduce(run3, pending);
        run3 = next;
        if (didApply) applied = true;
        pending = await this.executeEffects(run3, effects, before);
        if (TERMINAL.has(run3.state)) break;
      }
      if (!this.opts.dryRun) await this.opts.store.save(run3.id, run3);
      return {
        run: run3,
        applied,
        // An event that does not apply in the current state is ordinary traffic — a redelivery
        // arriving after the run moved on — but the caller should still know it changed nothing.
        ...applied ? {} : { reason: `a ${event.type} event does not apply to a run in "${stored.state}"` }
      };
    } finally {
      await lease.release();
    }
  }
};

// packages/core/src/webhook.ts
import { createHash as createHash4 } from "node:crypto";
function isBot(actor, bots) {
  return bots.has(actor.toLowerCase()) || actor.endsWith("[bot]");
}
var FeedbackCoalescer = class {
  constructor(opts = {}) {
    this.opts = opts;
    this.bots = new Set(
      [...opts.botLogins ?? [], "github-actions[bot]"].map((b) => b.toLowerCase())
    );
  }
  opts;
  /** Keyed by run and group; the run id is kept beside the key because it may contain a colon. */
  pending = /* @__PURE__ */ new Map();
  bots;
  /** Accept a delivery. Returns false when it was ignored, with no side effect. */
  add(event) {
    if (isBot(event.actor, this.bots)) return false;
    if (event.kind === "pr_merged" || event.kind === "pr_closed") {
      this.pending.set(`${event.runId}:closed`, { runId: event.runId, events: [event] });
      return true;
    }
    if (event.kind === "review_submitted" && event.state === "approved") {
      this.pending.set(`${event.runId}:approved`, { runId: event.runId, events: [event] });
      return true;
    }
    if (event.kind === "issue_comment" && !event.body?.trim()) return false;
    const key = `${event.runId}:feedback`;
    const group = this.pending.get(key) ?? { runId: event.runId, events: [] };
    group.events.push(event);
    this.pending.set(key, group);
    return true;
  }
  /**
   * Whether the window has elapsed for a group, given the current time.
   *
   * The window exists to gather a burst of related deliveries. A group that can never grow —
   * an approval, a closed pull request — has nothing to wait for, and `add` says as much, but
   * the check was applied to every group regardless. `reduce` rather than a spread so a large
   * burst cannot overflow the argument list.
   */
  ready(key, events, now) {
    if (key.endsWith(":approved") || key.endsWith(":closed")) return true;
    const windowMs = this.opts.windowMs ?? 3e3;
    const newest = events.reduce((max, e) => e.receivedAt > max ? e.receivedAt : max, -Infinity);
    return now - newest >= windowMs;
  }
  /**
   * Drain groups whose window has elapsed.
   *
   * `now` is injected rather than read from the clock so the burst behaviour is testable
   * without sleeping, which is the difference between this being covered and not.
   */
  flush(now = Date.now(), opts = {}) {
    const out = [];
    const drained = [];
    for (const [key, { runId, events }] of [...this.pending]) {
      if (!opts.force && !this.ready(key, events, now)) continue;
      this.pending.delete(key);
      if (!runId) continue;
      drained.push({ key, runId, events });
    }
    const terminal = new Set(drained.filter((g) => g.key.endsWith(":closed")).map((g) => g.runId));
    const approved = new Set(drained.filter((g) => g.key.endsWith(":approved")).map((g) => g.runId));
    for (const { key, runId, events } of drained) {
      const round = this.opts.currentRound?.(runId) ?? 0;
      if (key.endsWith(":closed")) {
        const merged2 = events.some((e) => e.kind === "pr_merged");
        out.push({
          runId,
          event: merged2 ? { type: "review_approved" } : { type: "cancelled", reason: "the pull request was closed without merging" },
          // Once per run, so the key does not need the round: a redelivery of a close is a
          // duplicate no matter how many rounds have passed.
          dedupeKey: `${runId}:${merged2 ? "merged" : "closed"}`,
          merged: 1
        });
        continue;
      }
      if (terminal.has(runId)) continue;
      const approval = events.find((e) => e.kind === "review_submitted" && e.state === "approved");
      if (approval && events.length === 1) {
        out.push({
          runId,
          event: { type: "review_approved" },
          /*
           * Keyed on the round, not on a delivery id.
           *
           * `deliveryId` is a header rather than part of the payload, so no producer here ever
           * sets one — the key fell through to `receivedAt`, which is a fresh timestamp on every
           * invocation. That made the durable dedupe for approvals inert: it looked like a guard
           * and matched nothing.
           *
           * The round is what makes a *second* approval genuinely different from a redelivery of
           * the first: approve, changes requested, approve again is three events and two of them
           * should apply.
           */
          dedupeKey: `${runId}:approved:round-${round}`,
          merged: 1
        });
        continue;
      }
      if (approved.has(runId)) continue;
      const merged = mergeFeedback(events, round);
      if (!merged) continue;
      out.push({
        runId,
        event: { type: "review_changes_requested", feedback: merged },
        /*
         * Keyed on content, not on delivery id.
         *
         * The same logical review redelivered arrives with a *new* delivery id, so keying on
         * that would let a redelivery through as fresh feedback. Content plus round is stable
         * across redeliveries and still distinguishes a genuine second review.
         */
        dedupeKey: `${runId}:round-${merged.round}:${fingerprint(merged)}`,
        merged: events.length
      });
    }
    return out;
  }
  /** Deliveries waiting on their window, for a caller deciding whether to keep polling. */
  get size() {
    return this.pending.size;
  }
};
function mergeFeedback(events, currentRound) {
  const bodies = [];
  const items = [];
  for (const event of events) {
    if (event.file) {
      items.push({
        file: event.file,
        ...event.line !== void 0 ? { line: event.line } : {},
        body: event.body ?? ""
      });
    } else if (event.body?.trim()) {
      bodies.push(event.body.trim());
    }
  }
  if (bodies.length === 0 && items.length === 0) return null;
  return {
    round: currentRound + 1,
    source: events[0]?.actor ?? "reviewer",
    body: bodies.join("\n\n") || "Changes were requested on the pull request.",
    ...items.length ? { items } : {}
  };
}
function fingerprint(feedback) {
  const text = feedback.body + (feedback.items ?? []).map((i) => `${i.file}:${i.line}:${i.body}`).join("|");
  return createHash4("sha256").update(text).digest("base64url").slice(0, 22);
}

// packages/agent-cli/src/index.ts
import { existsSync } from "node:fs";
import * as path14 from "node:path";

// packages/trajectory/src/steps.ts
import { createHash as createHash5 } from "node:crypto";
var MUTATING_WORDS = /* @__PURE__ */ new Set([
  "write",
  "writes",
  "edit",
  "edits",
  "create",
  "creates",
  "update",
  "updates",
  "delete",
  "deletes",
  "remove",
  "removes",
  "move",
  "moves",
  "rename",
  "renames",
  "patch",
  "apply",
  "install",
  "run",
  "exec",
  "bash",
  "shell",
  "commit",
  "commits",
  "push",
  "migrate",
  "migration",
  "migrations",
  "drop",
  "insert",
  "inserts",
  "truncate",
  "deploy",
  "publish",
  "set",
  "add",
  "append"
]);
var READING_WORDS = /* @__PURE__ */ new Set([
  "read",
  "reads",
  "get",
  "list",
  "lists",
  "search",
  "grep",
  "find",
  "glob",
  "view",
  "inspect",
  "show",
  "fetch",
  "query",
  "status",
  "diff",
  "log",
  "logs",
  "describe",
  "check",
  "count",
  "exists"
]);
function toolWords(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.toLowerCase());
}
function isMutating(toolName) {
  const words = toolWords(toolName);
  const readAt = words.findIndex((w) => READING_WORDS.has(w));
  const mutateAt = words.findIndex((w) => MUTATING_WORDS.has(w));
  if (mutateAt === -1) return false;
  if (readAt === -1) return true;
  return mutateAt < readAt;
}
function digest(text) {
  return createHash5("sha256").update(text).digest("base64url").slice(0, 22);
}
function signatureOf(toolName, args) {
  const normalised = JSON.stringify(
    args,
    (_key, value) => typeof value === "string" && value.length > 200 ? `${value.slice(0, 200)}\u2026` : value
  );
  return digest(`${toolName}:${normalised ?? ""}`);
}
function hashWorkspace(files, diff) {
  return digest(`${[...files].sort().join("|")}::${diff}`);
}

// packages/trajectory/src/trajectory.ts
var MAX_STEPS = 5e3;
var Trajectory = class _Trajectory {
  constructor(meta) {
    this.meta = meta;
  }
  meta;
  steps = [];
  seq = 0;
  droppedCount = 0;
  /** Record which agent this turned out to be, once that is known. */
  attribute(agentId, workspaceRoot) {
    this.meta.agentId = agentId;
    if (workspaceRoot) this.meta.workspaceRoot = workspaceRoot;
  }
  /** Trim the workspace prefix off a path, so a timeline reads as file names. */
  relative(text) {
    const root = this.meta.workspaceRoot;
    if (!root) return text;
    for (const candidate of [`/private${root}`, root]) {
      if (text.includes(candidate)) {
        return text.split(candidate).join("").replace(/^\/+/, "");
      }
    }
    return text;
  }
  static from(data) {
    const t = new _Trajectory(data.meta);
    t.steps = [...data.steps];
    t.seq = data.steps.at(-1)?.seq ?? 0;
    t.droppedCount = data.dropped;
    return t;
  }
  toJSON() {
    return { meta: this.meta, steps: this.steps, dropped: this.droppedCount };
  }
  get length() {
    return this.steps.length;
  }
  get all() {
    return this.steps;
  }
  /** Steps of a kind, newest last. */
  of(kind) {
    return this.steps.filter((s) => s.kind === kind);
  }
  /** A step's summary with the workspace prefix removed. */
  describe(step) {
    return this.relative(step.summary);
  }
  /** The most recent `n` steps, for questions about what is happening now. */
  recent(n) {
    return this.steps.slice(-n);
  }
  push(step) {
    const full = { seq: ++this.seq, at: step.at ?? Date.now(), ...step };
    this.steps.push(full);
    if (this.steps.length > MAX_STEPS) {
      const keepHead = Math.floor(MAX_STEPS * 0.2);
      const keepTail = MAX_STEPS - keepHead;
      this.droppedCount += this.steps.length - MAX_STEPS;
      this.steps = [...this.steps.slice(0, keepHead), ...this.steps.slice(-keepTail)];
    }
    return full;
  }
  dispatch(summary, data) {
    return this.push({ kind: "dispatch", name: "dispatch", summary, ...data ? { data } : {} });
  }
  /** Tool steps awaiting a result, keyed by the vendor's call id. */
  awaitingResult = /* @__PURE__ */ new Map();
  tool(name, args, opts = {}) {
    const data = {
      mutating: isMutating(name),
      signature: signatureOf(name, args),
      ...opts.ok !== void 0 ? { ok: opts.ok } : {},
      ...opts.error ? { error: opts.error } : {},
      ...opts.existed !== void 0 ? { existed: opts.existed } : {}
    };
    const step = this.push({
      kind: "tool",
      name,
      summary: describeArgs(name, args),
      data,
      ...opts.files?.length ? { files: opts.files } : {}
    });
    if (opts.id) this.awaitingResult.set(opts.id, step);
    return step;
  }
  /** Attach an outcome to a call recorded earlier. Unknown ids are ignored. */
  resolveTool(id, ok, error2) {
    const step = this.awaitingResult.get(id);
    if (!step) return;
    this.awaitingResult.delete(id);
    const data = step.data;
    data.ok = ok;
    if (error2) data.error = error2;
    if (!ok) step.summary = `${step.summary} \u2014 failed`;
  }
  message(text) {
    const trimmed = text.trim().replace(/\s+/g, " ");
    return this.push({
      kind: "message",
      name: "assistant",
      summary: trimmed.length > 160 ? `${trimmed.slice(0, 160)}\u2026` : trimmed
    });
  }
  /** Record a workspace sample and report how long nothing has changed. */
  observe(files, diff) {
    const workspaceHash = hashWorkspace(files, diff);
    const previous = [...this.steps].reverse().find((s) => s.kind === "observation");
    const previousHash = previous?.data?.workspaceHash;
    const previousStagnant = previous?.data?.stagnantFor ?? 0;
    const stagnantFor = previousHash === workspaceHash ? previousStagnant + 1 : 0;
    const data = { workspaceHash, filesChanged: files.length, stagnantFor };
    return this.push({
      kind: "observation",
      name: "workspace",
      summary: stagnantFor === 0 ? `${files.length} file(s) changed` : `unchanged for ${stagnantFor} sample(s)`,
      data
    });
  }
  gate(name, verdict2, reason) {
    return this.push({
      kind: "gate",
      name,
      summary: reason ? `${verdict2}: ${reason.split("\n")[0]}` : verdict2,
      data: { verdict: verdict2 }
    });
  }
  feedback(source, body) {
    return this.push({
      kind: "feedback",
      name: source,
      summary: body.trim().split("\n")[0]?.slice(0, 160) ?? ""
    });
  }
  intervention(name, summary, data) {
    return this.push({ kind: "intervention", name, summary, ...data ? { data } : {} });
  }
  result(status, summary, files) {
    this.meta.endedAt = Date.now();
    return this.push({ kind: "result", name: status, summary, files });
  }
  /** How many samples in a row have shown no change. */
  get stagnantSamples() {
    const last = [...this.steps].reverse().find((s) => s.kind === "observation");
    return last?.data?.stagnantFor ?? 0;
  }
  /** Tool calls whose signature matches, for spotting repetition. */
  repeatsOf(signature) {
    return this.steps.filter(
      (s) => s.kind === "tool" && s.data?.signature === signature
    );
  }
  /** Files the agent read, in order, for checking whether it looked before it leapt. */
  readFiles() {
    const out = [];
    for (const step of this.steps) {
      if (step.kind !== "tool") continue;
      if (step.data?.mutating) continue;
      out.push(...step.files ?? []);
    }
    return out;
  }
  /** A compact human-readable rendering, for a terminal or a handoff package. */
  render(opts = {}) {
    const limit = opts.limit ?? 60;
    const shown = this.steps.slice(-limit);
    const lines = [];
    if (this.droppedCount > 0 || shown.length < this.steps.length) {
      const hidden = this.droppedCount + (this.steps.length - shown.length);
      lines.push(`\u2026 ${hidden} earlier step(s) not shown`);
    }
    const start = this.meta.startedAt;
    for (const step of shown) {
      const elapsed = `${Math.round((step.at - start) / 1e3)}s`.padStart(6);
      const kind = step.kind.padEnd(12);
      lines.push(`${elapsed}  ${kind}${step.name.padEnd(18)} ${this.relative(step.summary)}`);
    }
    return lines.join("\n");
  }
};
function describeArgs(name, args) {
  if (!args || typeof args !== "object") return name;
  const record = args;
  for (const key of ["file_path", "path", "file", "command", "pattern", "query", "url"]) {
    const value = record[key];
    if (typeof value === "string") {
      return value.length > 120 ? `${value.slice(0, 120)}\u2026` : value;
    }
  }
  const keys = Object.keys(record).slice(0, 3);
  return keys.length ? keys.join(", ") : name;
}

// packages/trajectory/src/smells.ts
var toolData = (step) => step.kind === "tool" ? step.data : void 0;
function repeatedCall(opts = {}) {
  const threshold = opts.threshold ?? 3;
  return {
    name: "repeated-call",
    inspect(trajectory) {
      const counts = /* @__PURE__ */ new Map();
      for (const step of trajectory.all) {
        const data = toolData(step);
        if (!data) continue;
        const list2 = counts.get(data.signature) ?? [];
        list2.push(step);
        counts.set(data.signature, list2);
      }
      for (const [, steps] of counts) {
        if (steps.length < threshold) continue;
        const recent = trajectory.recent(12);
        if (!recent.includes(steps[steps.length - 1])) continue;
        return {
          name: "repeated-call",
          severity: "warn",
          detail: `\`${steps[0].name}\` called ${steps.length} times with identical arguments (${steps[0].summary})`,
          advice: "The agent is not learning from the result. Change the approach rather than the arguments \u2014 a different tool, or gathering more context first.",
          evidence: steps.map((s) => s.seq)
        };
      }
      return null;
    }
  };
}
function writeBeforeRead() {
  return {
    name: "write-before-read",
    inspect(trajectory) {
      const firstRead = /* @__PURE__ */ new Map();
      for (const step of trajectory.all) {
        const data = toolData(step);
        if (!data || data.mutating) continue;
        for (const file of step.files ?? []) {
          if (!firstRead.has(file)) firstRead.set(file, step.seq);
        }
      }
      const offenders = /* @__PURE__ */ new Map();
      const blind = [];
      for (const step of trajectory.all) {
        const data = toolData(step);
        if (!data?.mutating || data.existed !== true) continue;
        for (const file of step.files ?? []) {
          const readAt = firstRead.get(file);
          if (readAt !== void 0 && readAt < step.seq) continue;
          offenders.set(step.seq, step);
          blind.push(file);
        }
      }
      if (blind.length === 0) return null;
      return {
        name: "write-before-read",
        severity: "warn",
        detail: `${blind.length} existing file(s) modified without being read first: ${blind.slice(0, 3).join(", ")}`,
        advice: "Modifying a file whose contents the agent has not seen is a guess. Read it before changing it, or the change may silently drop work that was already there.",
        evidence: [...offenders.keys()].sort((a, b) => a - b)
      };
    }
  };
}
function actedOnUnresolvedError() {
  return {
    name: "acted-on-unresolved-error",
    inspect(trajectory) {
      const steps = trajectory.all;
      for (let i = 0; i < steps.length - 1; i++) {
        const data = toolData(steps[i]);
        if (!data || data.ok !== false) continue;
        for (let j = i + 1; j < Math.min(i + 4, steps.length); j++) {
          const next = toolData(steps[j]);
          if (!next) continue;
          if (!next.mutating) break;
          return {
            name: "acted-on-unresolved-error",
            severity: "warn",
            detail: `\`${steps[i].name}\` failed (${data.error ?? "no detail"}), then \`${steps[j].name}\` changed something without investigating`,
            advice: "The agent interpreted a failure without verifying its interpretation. Have it establish why the call failed before acting on what it assumes the failure meant.",
            evidence: [steps[i].seq, steps[j].seq]
          };
        }
      }
      return null;
    }
  };
}
function irreversibleWhileStruggling() {
  const IRREVERSIBLE = /\b(?:migrat(?:e|es|ed|ing|ion|ions)|drop(?:s|ped|ping)?|truncat(?:e|es|ed|ing|ion)|force.?push(?:es|ed|ing)?|rm\s+-rf|publish(?:es|ed|ing)?|deploy(?:s|ed|ing|ment|ments)?|charg(?:e|es|ed|ing)|send(?:s|ing)?|sent)\b/i;
  return {
    name: "irreversible-while-struggling",
    inspect(trajectory) {
      const struggling = trajectory.stagnantSamples >= 2 || trajectory.of("tool").filter((s) => toolData(s)?.ok === false).length >= 3;
      if (!struggling) return null;
      const risky = trajectory.of("tool").filter((s) => IRREVERSIBLE.test(`${s.name} ${s.summary}`));
      if (risky.length === 0) return null;
      return {
        name: "irreversible-while-struggling",
        severity: "block",
        detail: `an irreversible operation (${risky.at(-1).summary}) during a run that was already failing`,
        advice: "Nothing here can be undone by restoring files. Stop and have a human confirm before this proceeds.",
        evidence: risky.map((s) => s.seq)
      };
    }
  };
}
function allTalkNoAction(opts = {}) {
  const threshold = opts.threshold ?? 5;
  return {
    name: "all-talk-no-action",
    inspect(trajectory) {
      const recent = trajectory.recent(threshold * 2).filter((s) => s.kind === "message" || s.kind === "tool");
      if (recent.length < threshold) return null;
      const tail = recent.slice(-threshold);
      if (tail.some((s) => s.kind === "tool")) return null;
      return {
        name: "all-talk-no-action",
        severity: "warn",
        detail: `${threshold} consecutive messages with no tool call`,
        advice: "The agent is deliberating rather than acting. Narrow the task, or state the decision it is stuck on so it does not have to make it.",
        evidence: tail.map((s) => s.seq)
      };
    }
  };
}
var DEFAULT_DETECTORS = [
  repeatedCall(),
  writeBeforeRead(),
  actedOnUnresolvedError(),
  irreversibleWhileStruggling(),
  allTalkNoAction()
];
function inspect(trajectory, detectors = DEFAULT_DETECTORS) {
  const found = [];
  for (const detector of detectors) {
    const smell = detector.inspect(trajectory);
    if (smell) found.push(smell);
  }
  const order = { block: 0, warn: 1, note: 2 };
  return found.sort((a, b) => order[a.severity] - order[b.severity]);
}
function worstSeverity(smells) {
  if (smells.some((s) => s.severity === "block")) return "block";
  if (smells.some((s) => s.severity === "warn")) return "warn";
  return smells.length > 0 ? "note" : null;
}

// packages/trajectory/src/monitor.ts
var ProgressMonitor = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  timer = null;
  controller = new AbortController();
  verdict = null;
  sampling = false;
  /** Pass to the runner, so the monitor can stop the agent it is watching. */
  get signal() {
    return this.controller.signal;
  }
  get intervened() {
    return this.verdict;
  }
  start() {
    const interval = this.opts.sampleIntervalMs ?? 3e4;
    this.timer = setInterval(() => void this.sample(), interval);
    this.timer.unref?.();
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  /**
   * Take one sample.
   *
   * Guarded against overlap: on a large repository a sample can take longer than the interval,
   * and letting them pile up would both distort the stagnation count and load the machine the
   * agent is working on.
   */
  async sample() {
    if (this.sampling || this.verdict) return this.verdict;
    this.sampling = true;
    try {
      const [files, diff] = await Promise.all([
        this.opts.runner.changedFiles().catch(() => []),
        this.opts.runner.diff().catch(() => "")
      ]);
      this.opts.trajectory.observe(files, diff);
      const smells = inspect(this.opts.trajectory, this.opts.detectors);
      const severity = worstSeverity(smells);
      const stagnant = this.opts.trajectory.stagnantSamples;
      const stallAfter = this.opts.stallAfterSamples ?? 3;
      if (severity === "block") {
        return this.intervene({
          stalled: true,
          reason: smells.filter((s) => s.severity === "block").map((s) => s.detail).join("; "),
          smells,
          needsHuman: true
        });
      }
      if (stagnant >= stallAfter) {
        const named = smells.filter((s) => s.severity === "warn");
        return this.intervene({
          stalled: true,
          reason: named.length ? `no progress for ${stagnant} sample(s): ${named.map((s) => s.detail).join("; ")}` : `the workspace has not changed for ${stagnant} consecutive sample(s)`,
          smells,
          needsHuman: false
        });
      }
      return null;
    } finally {
      this.sampling = false;
    }
  }
  intervene(verdict2) {
    this.verdict = verdict2;
    this.opts.trajectory.intervention("stall", verdict2.reason, {
      needsHuman: verdict2.needsHuman,
      smells: verdict2.smells.map((s) => s.name)
    });
    this.opts.onIntervene?.(verdict2);
    this.stop();
    this.controller.abort();
    return verdict2;
  }
};
function stallFeedback(verdict2, round) {
  const lines = [
    "Your previous attempt was stopped because it stopped making progress.",
    "",
    `What was observed: ${verdict2.reason}`
  ];
  if (verdict2.smells.length > 0) {
    lines.push("", "Specifically:");
    for (const smell of verdict2.smells) {
      lines.push(`- ${smell.detail}`, `  ${smell.advice}`);
    }
  }
  lines.push(
    "",
    "Start from a different approach rather than resuming the previous one. If the task cannot",
    "be done as written, say so plainly instead of continuing to try."
  );
  return { round, source: "recovery", body: lines.join("\n") };
}

// packages/trajectory/src/otlp.ts
import { createHash as createHash6 } from "node:crypto";
var KIND_INTERNAL = 1;
var KIND_CLIENT = 3;
var STATUS_UNSET = 0;
var STATUS_ERROR = 2;
function attr(key, value) {
  if (value === void 0) return null;
  if (typeof value === "boolean") return { key, value: { boolValue: value } };
  if (typeof value === "number") return { key, value: { intValue: String(Math.round(value)) } };
  return { key, value: { stringValue: value } };
}
function attrs(entries) {
  return Object.entries(entries).map(([k, v]) => attr(k, v)).filter((a) => a !== null);
}
function nanos(ms2) {
  return `${Math.round(ms2)}000000`;
}
function traceIdFor(runId) {
  return createHash6("sha256").update(`contextmux:trace:${runId}`).digest("hex").slice(0, 32);
}
function spanIdFor(runId, seq) {
  return createHash6("sha256").update(`contextmux:span:${runId}:${seq}`).digest("hex").slice(0, 16);
}
function spanName(step) {
  if (step.kind === "tool") return `execute_tool ${step.name}`;
  return `${step.kind} ${step.name}`;
}
function stepAttributes(trajectory, step) {
  const base = {
    // Ours, because the conventions have no equivalent.
    "contextmux.step.kind": step.kind,
    "contextmux.step.seq": step.seq,
    "contextmux.step.summary": trajectory.describe(step)
  };
  if (step.kind === "tool") {
    const data = step.data;
    base["gen_ai.operation.name"] = "execute_tool";
    base["gen_ai.tool.name"] = step.name;
    base["gen_ai.agent.name"] = trajectory.meta.agentId;
    base["contextmux.tool.mutating"] = data?.mutating;
    base["contextmux.tool.signature"] = data?.signature;
    if (data?.error) base["contextmux.tool.error"] = data.error;
  }
  if (step.kind === "observation") {
    const data = step.data;
    base["contextmux.workspace.stagnant_samples"] = data?.stagnantFor;
    base["contextmux.workspace.files_changed"] = data?.filesChanged;
  }
  if (step.files?.length) base["contextmux.files"] = step.files.join(",");
  return attrs(base);
}
function toOtlp(trajectory, opts = {}) {
  const meta = trajectory.meta;
  const traceId = traceIdFor(meta.runId);
  const rootId = spanIdFor(meta.runId, "root");
  const endedAt = meta.endedAt ?? trajectory.all.at(-1)?.at ?? meta.startedAt;
  const smells = inspect(trajectory);
  const worst = smells.find((s) => s.severity === "block") ?? smells[0];
  const root = {
    traceId,
    spanId: rootId,
    name: `agent_run ${meta.taskId}`,
    kind: KIND_CLIENT,
    startTimeUnixNano: nanos(meta.startedAt),
    endTimeUnixNano: nanos(endedAt),
    attributes: attrs({
      "gen_ai.operation.name": "invoke_agent",
      "gen_ai.agent.name": meta.agentId,
      "contextmux.run.id": meta.runId,
      "contextmux.task.id": meta.taskId,
      "contextmux.run.round": meta.round,
      "contextmux.trajectory.steps": trajectory.length,
      "contextmux.trajectory.dropped": trajectory.toJSON().dropped,
      "contextmux.trajectory.tool_calls": trajectory.of("tool").length,
      // The findings travel with the trace, so a backend shows why a run is interesting
      // without needing to understand how they were derived.
      "contextmux.smells": smells.map((s) => s.name).join(",") || void 0,
      "contextmux.smells.worst": worst?.severity
    }),
    ...worst?.severity === "block" ? { status: { code: STATUS_ERROR, message: worst.detail } } : { status: { code: STATUS_UNSET } }
  };
  const steps = trajectory.all;
  const children = steps.map((step, i) => {
    const data = step.kind === "tool" ? step.data : void 0;
    const next = steps[i + 1];
    return {
      traceId,
      spanId: spanIdFor(meta.runId, step.seq),
      parentSpanId: rootId,
      name: spanName(step),
      kind: KIND_INTERNAL,
      startTimeUnixNano: nanos(step.at),
      // Steps are instants; ending where the next begins renders as a waterfall rather than
      // a row of zero-width ticks nobody can read.
      endTimeUnixNano: nanos(next?.at ?? endedAt),
      attributes: stepAttributes(trajectory, step),
      ...data?.ok === false ? { status: { code: STATUS_ERROR, message: data.error ?? "tool call failed" } } : {}
    };
  });
  return {
    resourceSpans: [
      {
        resource: {
          attributes: attrs({
            "service.name": opts.serviceName ?? "contextmux",
            "service.version": "0.1.0"
          })
        },
        scopeSpans: [
          {
            scope: { name: "@contextmux/trajectory", version: "0.1.0" },
            spans: [root, ...children]
          }
        ]
      }
    ]
  };
}
async function exportTrajectory(trajectory, opts) {
  const payload = toOtlp(trajectory, {
    ...opts.serviceName ? { serviceName: opts.serviceName } : {}
  });
  const spans = trajectory.length + 1;
  const url = `${opts.endpoint.replace(/\/$/, "")}/v1/traces`;
  const send = opts.fetchImpl ?? fetch;
  try {
    const res = await send(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...opts.headers },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5e3)
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, spans, detail: `collector returned ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true, spans, detail: `exported ${spans} span(s) to ${url}` };
  } catch (err) {
    return { ok: false, spans, detail: `could not reach ${url}: ${err.message}` };
  }
}
function endpointFromEnv() {
  return process.env["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"]?.replace(/\/v1\/traces$/, "") ?? process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? null;
}
function headersFromEnv() {
  const raw = process.env["OTEL_EXPORTER_OTLP_HEADERS"];
  if (!raw) return {};
  const out = {};
  for (const pair of raw.split(",")) {
    const [key, ...rest] = pair.split("=");
    if (key?.trim() && rest.length) out[key.trim()] = rest.join("=").trim();
  }
  return out;
}

// packages/agent-cli/src/index.ts
var REFUSAL_INSTRUCTION = [
  "If this task cannot be completed as written \u2014 it is ambiguous in a way you cannot resolve,",
  "it asks for something unsafe, or the codebase contradicts its premise \u2014 reply with a line",
  'beginning "REFUSED:" followed by the reason, and change nothing. A clear refusal is more',
  "useful than a plausible change that solves the wrong problem."
].join(" ");
var REFUSAL_MARKER = /^\s*(?:REFUSED|CANNOT PROCEED)\s*[:\-]/im;
var PREFLIGHT_TIMEOUT_MS = 1e4;
var CliAgent = class {
  constructor(spec, opts = {}) {
    this.spec = spec;
    this.opts = opts;
    this.id = spec.id;
    this.displayName = spec.displayName;
    this.capabilities = spec.capabilities;
  }
  spec;
  opts;
  kind = "driven";
  id;
  displayName;
  capabilities;
  get bin() {
    return this.opts.bin ?? this.spec.bin;
  }
  /**
   * Check the adapter can run before a task depends on it.
   *
   * Failing here costs a second. Failing later costs a run that looks like the agent could not
   * do the work, when the truth is the binary was never installed.
   */
  async preflight() {
    const { spawn: spawn6 } = await import("node:child_process");
    const timeoutMs = this.opts.preflightTimeoutMs ?? PREFLIGHT_TIMEOUT_MS;
    const version = await new Promise((resolve17) => {
      const child = spawn6(this.bin, ["--version"], { windowsHide: true });
      let out = "";
      let settled = false;
      const finish = (v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve17(v);
      };
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish({ code: 1, out, timedOut: true });
      }, timeoutMs);
      timer.unref?.();
      child.stdout.on("data", (d) => out += d);
      child.stderr.on("data", (d) => out += d);
      child.stdin.on("error", () => {
      });
      child.stdin.end();
      child.on("error", () => finish({ code: 127, out }));
      child.on("close", (code) => finish({ code: code ?? 1, out }));
    });
    if (version.timedOut) {
      return {
        ok: false,
        detail: `\`${this.bin} --version\` did not answer within ${timeoutMs / 1e3}s. It is usually waiting for input \u2014 check that it is logged in.`
      };
    }
    if (version.code === 127) {
      return {
        ok: false,
        detail: `\`${this.bin}\` is not on PATH. Install ${this.spec.displayName}, or set a different binary.`
      };
    }
    if (version.code !== 0) {
      return { ok: false, detail: `\`${this.bin} --version\` exited with ${version.code}` };
    }
    const missing = (this.spec.requires ?? []).filter((name) => !process.env[name]);
    if (missing.length > 0) {
      return { ok: false, detail: `${this.spec.displayName} needs ${missing.join(", ")} to be set.` };
    }
    const note = this.spec.confidence === "unverified" ? " \u2014 note: this adapter was written from documentation and has not been run against the real CLI here, so flags may need adjusting" : "";
    return { ok: true, detail: `${version.out.trim().split("\n")[0] || "available"}${note}` };
  }
  async run(input) {
    const { runner, prompt, budget, resumeFrom, signal } = input;
    const timeoutMs = budget?.maxDurationMs ?? this.opts.defaultBudget?.maxDurationMs ?? 20 * 6e4;
    const systemPrompt = [this.opts.appendSystemPrompt, REFUSAL_INSTRUCTION].filter(Boolean).join("\n\n");
    const wantsStream = Boolean(this.opts.trajectory && this.spec.streaming);
    const invocation = this.spec.invoke({
      prompt,
      ...budget ?? this.opts.defaultBudget ? { budget: budget ?? this.opts.defaultBudget } : {},
      ...resumeFrom?.sessionId ? { resumeSessionId: resumeFrom.sessionId } : {},
      systemPrompt,
      ...this.opts.model ? { model: this.opts.model } : {},
      isolated: this.opts.isolated ?? false,
      ...wantsStream ? { streaming: true } : {},
      ...this.opts.extraArgs ? { extraArgs: this.opts.extraArgs } : {}
    });
    const trajectory = this.opts.trajectory;
    trajectory?.dispatch(`${this.id} invoked`, { round: input.feedback?.round ?? 0 });
    if (input.feedback) trajectory?.feedback(input.feedback.source, input.feedback.body);
    const streaming = wantsStream ? this.spec.streaming : null;
    const args = invocation.args;
    const monitor = trajectory && this.opts.recovery ? new ProgressMonitor({
      runner,
      trajectory,
      ...this.opts.recovery.sampleIntervalMs !== void 0 ? { sampleIntervalMs: this.opts.recovery.sampleIntervalMs } : {},
      ...this.opts.recovery.stallAfterSamples !== void 0 ? { stallAfterSamples: this.opts.recovery.stallAfterSamples } : {}
    }) : null;
    monitor?.start();
    const combined = combineSignals([signal, monitor?.signal]);
    let exec2;
    try {
      exec2 = await runner.exec(this.bin, args, {
        timeoutMs,
        ...invocation.stdin !== void 0 ? { input: invocation.stdin } : {},
        ...invocation.env || this.opts.env ? { env: { ...this.opts.env, ...invocation.env } } : {},
        ...combined.signal ? { signal: combined.signal } : {},
        ...streaming ? {
          onStdoutLine: (line) => {
            const parsed = streaming.parseLine(line);
            if (!parsed) return;
            for (const event of Array.isArray(parsed) ? parsed : [parsed]) {
              if (event.type === "tool") {
                trajectory.tool(event.name, event.args, {
                  ...event.ok !== void 0 ? { ok: event.ok } : {},
                  ...event.error ? { error: event.error } : {},
                  ...event.files?.length ? { files: event.files } : {},
                  ...event.id ? { id: event.id } : {},
                  ...existedFlag(runner.cwd, event.name, event.files)
                });
              } else if (event.type === "tool-result") {
                trajectory.resolveTool(event.id, event.ok, event.error);
              } else {
                trajectory.message(event.text);
              }
            }
          }
        } : {}
      });
    } finally {
      monitor?.stop();
      combined.dispose();
    }
    const filesChanged = await runner.changedFiles();
    const diff = await runner.diff();
    const outcome = this.spec.parse(exec2.stdout, exec2.stderr, exec2.code);
    const handle = {
      ref: outcome?.sessionId ?? `${this.id}-${Date.now().toString(36)}`,
      agentId: this.id,
      ...outcome?.sessionId ? { sessionId: outcome.sessionId } : {}
    };
    const base = {
      filesChanged,
      ...diff ? { diff } : {},
      location: runner.cwd ? { worktree: runner.cwd } : {},
      ...outcome?.usage ? { usage: outcome.usage } : {},
      ...handle.sessionId ? { sessionId: handle.sessionId } : {}
    };
    const stall = monitor?.intervened;
    if (stall) {
      trajectory?.result("stalled", stall.reason, filesChanged);
      return {
        result: {
          ...base,
          status: stall.needsHuman ? "refused" : "failed",
          summary: stall.reason,
          error: stall.reason,
          // The diagnosis travels with the failure, so the orchestrator can retry with it.
          ...stall.needsHuman ? {} : { recovery: stallFeedback(stall, (input.feedback?.round ?? 0) + 1) }
        },
        handle
      };
    }
    if (exec2.timedOut) {
      trajectory?.result("timeout", "exceeded its time budget", filesChanged);
      return {
        result: {
          ...base,
          status: "failed",
          summary: "The agent exceeded its time budget.",
          error: `timed out after ${timeoutMs}ms`
        },
        handle
      };
    }
    if (!outcome) {
      const detail = (exec2.stderr || exec2.stdout).trim().split("\n").slice(-15).join("\n");
      trajectory?.result("failed", "produced no parseable result", filesChanged);
      return {
        result: {
          ...base,
          status: "failed",
          summary: "The agent produced no parseable result.",
          error: `exit ${exec2.code}${detail ? `: ${detail}` : ""}`
        },
        handle
      };
    }
    if (REFUSAL_MARKER.test(outcome.text)) {
      trajectory?.result("refused", outcome.text.trim().slice(0, 200), filesChanged);
      return {
        result: {
          ...base,
          status: "refused",
          summary: outcome.text.trim(),
          error: outcome.text.replace(REFUSAL_MARKER, "").trim().split("\n")[0] ?? "refused"
        },
        handle
      };
    }
    if (outcome.isError || exec2.code !== 0) {
      trajectory?.result("failed", outcome.stopReason ?? `exit ${exec2.code}`, filesChanged);
      return {
        result: {
          ...base,
          status: "failed",
          summary: outcome.text.trim() || "The agent reported an error.",
          error: outcome.stopReason ?? `exit ${exec2.code}`
        },
        handle
      };
    }
    const maxCost = budget?.maxCostUsd ?? this.opts.defaultBudget?.maxCostUsd;
    const spent = outcome.usage?.costUsd;
    if (maxCost !== void 0 && spent !== void 0 && spent > maxCost) {
      trajectory?.result("failed", `cost ${spent.toFixed(4)} USD exceeded the budget`, filesChanged);
      return {
        result: {
          ...base,
          status: "failed",
          summary: outcome.text.trim(),
          error: `cost ${spent.toFixed(4)} USD exceeded the budget of ${maxCost} USD`
        },
        handle
      };
    }
    if (outcome.stopReason === "max_turns") {
      trajectory?.result("failed", "hit the turn limit before finishing", filesChanged);
      return {
        result: {
          ...base,
          status: "failed",
          summary: outcome.text.trim(),
          error: "hit the turn limit before finishing; the change on disk is incomplete"
        },
        handle
      };
    }
    trajectory?.result("succeeded", outcome.text.trim().slice(0, 200), filesChanged);
    return {
      result: { ...base, status: "succeeded", summary: outcome.text.trim() || "No summary provided." },
      handle
    };
  }
};
function existedFlag(cwd, toolName, files) {
  if (!cwd || !files?.length || !isMutating(toolName)) return {};
  try {
    return { existed: files.every((f) => existsSync(path14.resolve(cwd, f))) };
  } catch {
    return {};
  }
}
function combineSignals(signals) {
  const present = signals.filter((s) => Boolean(s));
  if (present.length === 0) return { signal: void 0, dispose: () => {
  } };
  if (present.length === 1) return { signal: present[0], dispose: () => {
  } };
  const controller = new AbortController();
  const forward = () => controller.abort();
  const attached = [];
  for (const signal of present) {
    if (signal.aborted) {
      forward();
      break;
    }
    signal.addEventListener("abort", forward, { once: true });
    attached.push(signal);
  }
  return {
    signal: controller.signal,
    dispose: () => {
      for (const signal of attached) signal.removeEventListener("abort", forward);
    }
  };
}
function extractJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
  }
  const lines = trimmed.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
    }
  }
  return null;
}
function textFromStream(stdout) {
  const parts = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const event = JSON.parse(trimmed);
      const message = event["message"];
      for (const block of message?.content ?? []) {
        if (block.type === "text" && block.text) parts.push(block.text);
      }
      if (typeof event["result"] === "string") parts.push(event["result"]);
    } catch {
    }
  }
  return parts.join("\n").trim();
}

// packages/agent-claude/src/prompt.ts
function terms(text) {
  return new Set(
    text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3)
  );
}
function scoreSkill(skill, task) {
  const wanted = terms(`${skill.name} ${skill.description}`);
  if (wanted.size === 0) return 0;
  const present = terms(`${task.title} ${task.body}`);
  let shared = 0;
  for (const term of wanted) if (present.has(term)) shared += 1;
  let score = shared / wanted.size;
  if (skill.globs.length > 0 && task.scope.allow.length > 0) {
    if (skill.globs.some((g) => task.scope.allow.some((a) => globsOverlap(g, a)))) score += 0.5;
  }
  return score;
}
function relevantRules(rules, task) {
  return rules.filter((rule) => {
    if (rule.alwaysApply || rule.globs.length === 0) return true;
    if (task.scope.allow.length === 0) return true;
    return rule.globs.some((g) => task.scope.allow.some((a) => globsOverlap(g, a)));
  }).sort((a, b) => b.priority - a.priority);
}
function demoteHeadings(body, under) {
  let fenced = false;
  return body.split("\n").map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return line;
    }
    if (fenced) return line;
    const heading2 = /^(#{1,6}) (.*)$/.exec(line);
    if (!heading2) return line;
    return `${"#".repeat(Math.min(heading2[1].length + under, 6))} ${heading2[2]}`;
  }).join("\n");
}
function renderPrompt(opts) {
  const { task, context, index, feedback } = opts;
  const parts = [];
  if (feedback) {
    parts.push(
      [
        `# Revision round ${feedback.round}`,
        "",
        `Your previous attempt at this task did not pass. Feedback from ${feedback.source}:`,
        "",
        feedback.body,
        ...feedback.items?.length ? ["", "Specific comments:", ...feedback.items.map((i) => `- ${i.file}${i.line ? `:${i.line}` : ""} \u2014 ${i.body}`)] : [],
        "",
        "Fix exactly what is described above. Do not make unrelated changes, and do not revert",
        "work that was not criticised."
      ].join("\n")
    );
  }
  parts.push(
    [
      `# Task: ${task.title}`,
      "",
      task.body,
      ...task.acceptanceCriteria.length ? [
        "",
        "## Acceptance criteria",
        "",
        "Every one of these must be true when you are done:",
        "",
        ...task.acceptanceCriteria.map((c2) => `- ${c2.text}`)
      ] : [],
      /*
       * Attachments, named and declared unreadable.
       *
       * The body arrives with `![screenshot.png](attachment:abc)` in it, because discarding a
       * screenshot silently would discard the specification — for UI work the picture is
       * frequently the whole requirement. But the agent cannot fetch it: the link needs Jira
       * credentials it does not have. Left unexplained, a dangling image reference invites it
       * to imagine what the picture showed, which is the worst of the three options.
       *
       * So the reference stays and the limitation is stated. An agent that knows it is missing
       * something can say so; one that does not, guesses.
       */
      ...task.attachments?.length ? [
        "",
        "## Attachments you cannot see",
        "",
        `This task has ${task.attachments.length} attachment(s), referenced in the text above:`,
        "",
        ...task.attachments.map((a) => `- ${a.name}`),
        "",
        "You have no way to open them. Do not guess at what they show. If the change depends",
        "on their contents, say so plainly and stop rather than proceeding on an assumption."
      ] : []
    ].join("\n")
  );
  const scopeLines = [];
  if (task.scope.allow.length > 0) {
    scopeLines.push(`- You may modify only: ${task.scope.allow.map((p) => `\`${p}\``).join(", ")}`);
  }
  if (task.scope.deny.length > 0) {
    scopeLines.push(`- You must not modify: ${task.scope.deny.map((p) => `\`${p}\``).join(", ")}`);
  }
  if (task.scope.maxFiles !== void 0) {
    scopeLines.push(`- Change at most ${task.scope.maxFiles} file(s)`);
  }
  if (scopeLines.length > 0) {
    parts.push(
      [
        "## Scope",
        "",
        ...scopeLines,
        "",
        "These boundaries are checked automatically after you finish. A change outside them is",
        "rejected and sent back, so staying inside them is faster than not."
      ].join("\n")
    );
  }
  const delegated = opts.audience === "delegated";
  if (delegated && (context?.instructions?.body || context?.rules?.length)) {
    parts.push(
      [
        "## Project conventions",
        "",
        "This repository carries its own conventions, compiled by contextmux, and you are",
        "working inside a checkout of it. Read them rather than assuming defaults:",
        "",
        "- `.github/copilot-instructions.md` \u2014 how this project is written",
        "- `.github/instructions/*.instructions.md` \u2014 rules scoped to particular paths",
        "",
        "They are not repeated here because you can open them, and repeating them would not",
        "fit in an issue body."
      ].join("\n")
    );
  }
  if (!delegated && context?.instructions?.body) {
    parts.push(["## Project conventions", "", demoteHeadings(context.instructions.body.trim(), 2)].join("\n"));
  }
  if (!delegated && context?.rules?.length) {
    const rules = relevantRules(context.rules, task);
    if (rules.length > 0) {
      parts.push(
        [
          "## Rules",
          "",
          ...rules.map(
            (r) => [
              `### ${r.description ?? r.name}`,
              r.globs.length ? `_Applies to: ${r.globs.map((g) => `\`${g}\``).join(", ")}_` : "",
              "",
              demoteHeadings(r.body.trim(), 3)
            ].filter(Boolean).join("\n")
          )
        ].join("\n\n")
      );
    }
  }
  if (context?.skills?.length) {
    const ranked = context.skills.map((s) => ({ skill: s, score: scoreSkill(s, task) })).filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, opts.maxSkills ?? 3);
    if (ranked.length > 0) {
      parts.push(
        [
          "## Relevant practices",
          "",
          ...ranked.map(
            ({ skill }) => [`### ${skill.name}`, `_${skill.description}_`, "", demoteHeadings(skill.body.trim(), 3)].join("\n")
          )
        ].join("\n\n")
      );
    }
  }
  if (index) {
    const map = buildMap(index, {
      text: `${task.title}
${task.body}`,
      budget: opts.repoBudget ?? 3e3,
      ...task.scope.allow.length ? { paths: task.scope.allow } : {}
    });
    parts.push(
      [
        map.text.trim(),
        "",
        "Read the relevant files before writing anything. If something close to what you need",
        "already exists, extend it rather than adding a parallel implementation."
      ].join("\n")
    );
  }
  if (task.qualityGate.length > 0 && !delegated) {
    parts.push(
      [
        "## Before you finish",
        "",
        "Run these and fix every failure:",
        "",
        "```bash",
        ...task.qualityGate,
        "```",
        "",
        "These are run again automatically after you finish. A failure sends the task back to",
        "you, so it is cheaper to fix it now."
      ].join("\n")
    );
  } else if (task.qualityGate.length > 0) {
    parts.push(
      [
        "## Verification happens outside this environment",
        "",
        "Do not install dependencies and do not run the test suite. This environment has no",
        "credentials for the project and may have no route to its package registry, so the",
        "attempt will fail however many ways you try it.",
        "",
        "These are run for you once you finish, somewhere that can:",
        "",
        "```bash",
        ...task.qualityGate,
        "```",
        "",
        "Make the change, satisfy the acceptance criteria by reading the code, and stop."
      ].join("\n")
    );
  }
  parts.push(
    [
      "## If something blocks you",
      "",
      "Try at most twice. If a command fails a second time for the same reason, stop and say",
      "what blocked you \u2014 the exact command and the error. Do not reach for a different package",
      "manager, a different runner, or a manual install.",
      "",
      "An accurate account of what stopped you is worth more than a workaround, and something",
      "that cannot work here is usually a missing credential or a blocked host, which no amount",
      "of retrying will supply."
    ].join("\n")
  );
  parts.push(
    [
      "## Working agreement",
      "",
      "- Make the change. Do not ask for confirmation \u2014 there is nobody to answer.",
      "- If an existing test fails after your change, your implementation is wrong. Fix the",
      "  implementation, not the test.",
      "- If the task is impossible or unsafe as written, stop and say so plainly, explaining why.",
      "  Do not produce a partial change that looks complete.",
      "- End with a short summary of what you changed and why."
    ].join("\n")
  );
  return parts.join("\n\n---\n\n");
}

// packages/agent-claude/src/index.ts
var CLAUDE_SPEC = {
  id: "claude-code",
  displayName: "Claude Code",
  bin: "claude",
  confidence: "verified",
  capabilities: {
    promptControl: "full",
    resume: "session",
    sandbox: "caller",
    budgetable: true
  },
  invoke({ prompt, budget, resumeSessionId, systemPrompt, model, isolated, streaming, extraArgs }) {
    const args = streaming ? ["-p", prompt, "--output-format", "stream-json", "--verbose"] : ["-p", prompt, "--output-format", "json"];
    args.push("--permission-mode", isolated ? "bypassPermissions" : "acceptEdits");
    if (model) args.push("--model", model);
    args.push("--append-system-prompt", systemPrompt);
    if (budget?.maxTurns) args.push("--max-turns", String(budget.maxTurns));
    if (resumeSessionId) args.push("--resume", resumeSessionId);
    if (extraArgs?.length) args.push(...extraArgs);
    return { args };
  },
  /*
   * Claude Code's streaming format, read off real output rather than documentation.
   *
   * A call and its result arrive as separate events — the call inside an `assistant` message,
   * the result inside the following `user` message, correlated by `tool_use_id`. Recording
   * only the calls would make every one of them look successful, and the detector that matters
   * most, acting on an unresolved error, would never fire.
   */
  streaming: {
    parseLine(line) {
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        return null;
      }
      const message = event["message"];
      const blocks2 = Array.isArray(message?.content) ? message.content : [];
      const out = [];
      if (event["type"] === "assistant") {
        for (const raw of blocks2) {
          const block = raw;
          if (block["type"] === "tool_use") {
            const input = block["input"] ?? {};
            const files = ["file_path", "path", "notebook_path"].map((k) => input[k]).filter((v) => typeof v === "string");
            out.push({
              type: "tool",
              name: String(block["name"] ?? "tool"),
              args: input,
              ...typeof block["id"] === "string" ? { id: block["id"] } : {},
              ...files.length ? { files } : {}
            });
            continue;
          }
          if (block["type"] === "text" && typeof block["text"] === "string" && block["text"].trim()) {
            out.push({ type: "message", text: block["text"] });
          }
        }
        return out.length ? out : null;
      }
      if (event["type"] === "user") {
        for (const raw of blocks2) {
          const block = raw;
          if (block["type"] !== "tool_result") continue;
          const id = block["tool_use_id"];
          if (typeof id !== "string") continue;
          const failed = block["is_error"] === true;
          out.push({
            type: "tool-result",
            id,
            ok: !failed,
            ...failed ? { error: String(block["content"] ?? "tool failed").slice(0, 200) } : {}
          });
        }
        return out.length ? out : null;
      }
      return null;
    }
  },
  parse(stdout, _stderr, _exitCode) {
    const json = extractJson(stdout);
    if (!json) return null;
    const usageRaw = json["usage"];
    const usage = {
      ...usageRaw?.input_tokens !== void 0 ? { inputTokens: usageRaw.input_tokens } : {},
      ...usageRaw?.output_tokens !== void 0 ? { outputTokens: usageRaw.output_tokens } : {},
      ...typeof json["total_cost_usd"] === "number" ? { costUsd: json["total_cost_usd"] } : {},
      ...typeof json["num_turns"] === "number" ? { turns: json["num_turns"] } : {}
    };
    return {
      text: typeof json["result"] === "string" ? json["result"] : "",
      ...typeof json["session_id"] === "string" ? { sessionId: json["session_id"] } : {},
      ...Object.keys(usage).length ? { usage } : {},
      ...json["is_error"] === true ? { isError: true } : {},
      ...typeof json["stop_reason"] === "string" ? { stopReason: json["stop_reason"] } : {}
    };
  }
};
var ClaudeAgent = class extends CliAgent {
  constructor(opts = {}) {
    const spec = opts.permissionMode ? {
      ...CLAUDE_SPEC,
      invoke: (input) => {
        const built = CLAUDE_SPEC.invoke(input);
        const args = [...built.args];
        const at = args.indexOf("--permission-mode");
        if (at >= 0) args[at + 1] = opts.permissionMode;
        return { ...built, args };
      }
    } : CLAUDE_SPEC;
    super(spec, opts);
  }
};
function claudeAgent(opts = {}) {
  return new ClaudeAgent(opts);
}

// packages/runner-local/src/index.ts
import { spawn as spawn2 } from "node:child_process";
import { createHash as createHash7 } from "node:crypto";
import { promises as fs13 } from "node:fs";
import * as os from "node:os";
import * as path15 from "node:path";
async function git2(cwd, args) {
  return new Promise((resolve17) => {
    const child = spawn2("git", args, { cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => stdout += d);
    child.stderr.on("data", (d) => stderr += d);
    child.on("close", (code) => resolve17({ code: code ?? 1, stdout, stderr }));
    child.on("error", (err) => resolve17({ code: 1, stdout, stderr: String(err) }));
  });
}
var CTXMUX_ARTEFACTS = [
  ".ctxmux/state/",
  ".ctxmux/cache/",
  ".ctxmux/out/",
  // The tracker rewrites the task file's status while the run is in flight.
  ".ctxmux/tasks/"
];
async function findWorktreeForBranch(root, branch) {
  const listed = await git2(root, ["worktree", "list", "--porcelain"]);
  if (listed.code !== 0) return null;
  let current = null;
  for (const line of listed.stdout.split("\n")) {
    if (line.startsWith("worktree ")) current = line.slice("worktree ".length).trim();
    else if (line.startsWith("branch ") && current) {
      const ref = line.slice("branch ".length).trim();
      if (ref === `refs/heads/${branch}`) return current;
    }
  }
  return null;
}
var LocalRunner = class _LocalRunner {
  constructor(cwd, opts) {
    this.opts = opts;
    this.cwd = cwd;
  }
  opts;
  id = "local";
  cwd;
  baseRef = null;
  worktreePath = null;
  /*
   * The branch actually used, which is not always the one that was asked for.
   *
   * `create` defaults to a generated name when the caller does not supply one, and that name
   * only ever existed as a local. So `location()` reported no branch at all for a generated
   * run — leaving a human with a worktree path and no way to name what they were looking at —
   * and `dispose` had nothing to delete, so every such branch outlived its worktree.
   */
  branch = null;
  disposed = false;
  isArtefact(file) {
    const prefixes = [...CTXMUX_ARTEFACTS, ...this.opts.exclude ?? []];
    return prefixes.some((p) => file === p.replace(/\/$/, "") || file.startsWith(p));
  }
  /**
   * Create a runner.
   *
   * Isolation is requested, not guaranteed: a directory that is not a git repository, or a
   * repository with no commits, cannot host a worktree. Falling back with a clear signal beats
   * failing, but it must be visible — a caller who asked for isolation and silently did not get
   * it would have an agent editing their working tree.
   */
  static async create(opts) {
    const root = path15.resolve(opts.root);
    if (!opts.isolate) {
      const runner2 = new _LocalRunner(root, opts);
      await runner2.captureBase();
      return { runner: runner2, isolated: false };
    }
    const head = await git2(root, ["rev-parse", "HEAD"]);
    if (head.code !== 0) {
      const runner2 = new _LocalRunner(root, opts);
      await runner2.captureBase();
      return {
        runner: runner2,
        isolated: false,
        note: "isolation unavailable: not a git repository, or it has no commits \u2014 running in the working tree instead"
      };
    }
    const branch = opts.branch ?? `ctxmux/${Date.now().toString(36)}`;
    const repoKey = createHash7("sha1").update(root).digest("hex").slice(0, 8);
    const dir = opts.worktreeDir ?? path15.join(os.tmpdir(), "ctxmux-worktrees", `${repoKey}-${branch.replace(/\//g, "-")}`);
    await fs13.mkdir(path15.dirname(dir), { recursive: true });
    const created = await git2(root, ["worktree", "add", "-b", branch, dir, "HEAD"]);
    if (created.code !== 0) {
      const existing = await findWorktreeForBranch(root, branch);
      if (existing) {
        const runner3 = new _LocalRunner(existing, opts);
        runner3.worktreePath = existing;
        runner3.branch = branch;
        runner3.baseRef = head.stdout.trim();
        return { runner: runner3, isolated: true, note: `reusing the existing worktree for ${branch}` };
      }
      const stale = await fs13.readdir(dir).then(
        () => true,
        () => false
      );
      if (stale) {
        await fs13.rm(dir, { recursive: true, force: true });
        await git2(root, ["worktree", "prune"]);
        const retry = await git2(root, ["worktree", "add", "-B", branch, dir, "HEAD"]);
        if (retry.code === 0) {
          const runner3 = new _LocalRunner(dir, opts);
          runner3.worktreePath = dir;
          runner3.branch = branch;
          runner3.baseRef = head.stdout.trim();
          return { runner: runner3, isolated: true };
        }
      }
      const runner2 = new _LocalRunner(root, opts);
      await runner2.captureBase();
      return {
        runner: runner2,
        isolated: false,
        note: `isolation unavailable: ${created.stderr.trim() || "git worktree add failed"} \u2014 running in the working tree instead`
      };
    }
    const runner = new _LocalRunner(dir, opts);
    runner.worktreePath = dir;
    runner.branch = branch;
    runner.baseRef = head.stdout.trim();
    return { runner, isolated: true };
  }
  /**
   * A runner over a branch that exists on the remote, for verifying somebody else's work.
   *
   * A delegated agent's changes live on a branch we never had. Without this the verify gates
   * ran in whatever checkout the process happened to start in — so `quality-gate` compiled the
   * developer's working tree and reported the verdict as if it were the pull request's. It
   * could pass over a broken change or fail over unrelated local edits, and neither is
   * distinguishable from a real answer.
   *
   * Detached on purpose: nothing here should ever be committed to, and a detached worktree
   * cannot be pushed from by accident.
   */
  static async atRef(opts) {
    const root = path15.resolve(opts.root);
    const fetched = await git2(root, ["fetch", "--no-tags", "--depth", "1", "origin", opts.ref]);
    if (fetched.code !== 0) {
      throw new Error(
        `could not fetch "${opts.ref}" from origin: ${fetched.stderr.trim().split("\n").slice(-2).join(" ")}`
      );
    }
    const head = await git2(root, ["rev-parse", "FETCH_HEAD"]);
    if (head.code !== 0) throw new Error(`fetched "${opts.ref}" but could not resolve it`);
    const sha = head.stdout.trim();
    const repoKey = createHash7("sha1").update(root).digest("hex").slice(0, 8);
    const dir = opts.worktreeDir ?? path15.join(os.tmpdir(), "ctxmux-verify", `${repoKey}-${sha.slice(0, 12)}`);
    await fs13.mkdir(path15.dirname(dir), { recursive: true });
    await fs13.rm(dir, { recursive: true, force: true }).catch(() => {
    });
    await git2(root, ["worktree", "prune"]);
    const added = await git2(root, ["worktree", "add", "--detach", dir, sha]);
    if (added.code !== 0) {
      throw new Error(`could not create a worktree at ${opts.ref}: ${added.stderr.trim()}`);
    }
    const runner = new _LocalRunner(dir, { root: opts.root });
    runner.worktreePath = dir;
    runner.baseRef = sha;
    return { runner, note: `verifying ${opts.ref} at ${sha.slice(0, 7)}` };
  }
  /** Record where the run started, so `changedFiles` means "changed by this run". */
  async captureBase() {
    const head = await git2(this.cwd, ["rev-parse", "HEAD"]);
    this.baseRef = head.code === 0 ? head.stdout.trim() : null;
  }
  async exec(command, args, opts = {}) {
    if (this.disposed) throw new Error("runner has been disposed");
    const timeoutMs = opts.timeoutMs ?? this.opts.defaultTimeoutMs ?? 15 * 6e4;
    const started = Date.now();
    return new Promise((resolve17) => {
      const child = spawn2(command, args, {
        cwd: this.cwd,
        env: { ...process.env, ...this.opts.env, ...opts.env },
        windowsHide: true
      });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let settled = false;
      const finish = (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        opts.signal?.removeEventListener("abort", onAbort);
        resolve17({ code, stdout, stderr, timedOut, durationMs: Date.now() - started });
      };
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 5e3).unref?.();
      }, timeoutMs);
      const onAbort = () => {
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 5e3).unref?.();
      };
      opts.signal?.addEventListener("abort", onAbort, { once: true });
      let pending = "";
      child.stdout.on("data", (d) => {
        const text = String(d);
        stdout += text;
        if (!opts.onStdoutLine) return;
        pending += text;
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) {
            try {
              opts.onStdoutLine(line);
            } catch {
            }
          }
        }
      });
      child.stderr.on("data", (d) => stderr += d);
      child.on("close", (code) => {
        if (opts.onStdoutLine && pending.trim()) {
          try {
            opts.onStdoutLine(pending);
          } catch {
          }
        }
        finish(code ?? 1);
      });
      child.on("error", (err) => {
        stderr += `
${err.code === "ENOENT" ? `command not found: ${command}` : String(err)}`;
        finish(127);
      });
      child.stdin.on("error", () => {
      });
      if (opts.input !== void 0) child.stdin.write(opts.input);
      child.stdin.end();
    });
  }
  /**
   * Files changed since the run started.
   *
   * Includes untracked files: a new file the agent created is very much a change, and omitting
   * it would let a scope gate miss the most obvious violation there is.
   */
  async changedFiles() {
    const tracked = await git2(this.cwd, ["diff", "--name-only", "HEAD"]);
    const untracked = await git2(this.cwd, ["ls-files", "--others", "--exclude-standard"]);
    const staged = await git2(this.cwd, ["diff", "--name-only", "--cached"]);
    const files = /* @__PURE__ */ new Set();
    for (const out of [tracked.stdout, untracked.stdout, staged.stdout]) {
      for (const line of out.split("\n")) {
        const f = line.trim();
        if (f) files.add(f);
      }
    }
    if (this.baseRef) {
      const sinceBase = await git2(this.cwd, ["diff", "--name-only", `${this.baseRef}..HEAD`]);
      for (const line of sinceBase.stdout.split("\n")) {
        const f = line.trim();
        if (f) files.add(f);
      }
    }
    return [...files].filter((f) => !this.isArtefact(f)).sort();
  }
  async diff() {
    const exclusions = [...CTXMUX_ARTEFACTS, ...this.opts.exclude ?? []].map(
      (p) => `:(exclude)${p.replace(/\/$/, "")}/**`
    );
    const parts = [];
    if (this.baseRef) {
      const committed = await git2(this.cwd, ["diff", `${this.baseRef}..HEAD`, "--", ".", ...exclusions]);
      if (committed.stdout.trim()) parts.push(committed.stdout);
    }
    const working = await git2(this.cwd, ["diff", "HEAD", "--", ".", ...exclusions]);
    if (working.stdout.trim()) parts.push(working.stdout);
    const untracked = await git2(this.cwd, ["ls-files", "--others", "--exclude-standard"]);
    for (const file of untracked.stdout.split("\n").map((l) => l.trim()).filter(Boolean)) {
      if (this.isArtefact(file)) continue;
      const shown = await git2(this.cwd, ["diff", "--no-index", "/dev/null", file]);
      if (shown.stdout.trim()) parts.push(shown.stdout);
    }
    return parts.join("\n");
  }
  /** Where the work ended up, for reporting back to a human. */
  location() {
    return {
      ...this.branch ? { branch: this.branch } : {},
      ...this.worktreePath ? { worktree: this.worktreePath } : {}
    };
  }
  /**
   * Dispose.
   *
   * Deliberately does *not* remove a worktree that contains work. The whole point of isolation
   * is that a human can inspect what the agent did; deleting it on the way out would throw
   * away the artefact the run existed to produce.
   *
   * A worktree that was reclaimed is cleared from `location()`, so a caller can tell afterwards
   * whether there is still anything to point a human at. Sending someone to `cd` into a
   * directory that has just been removed is worse than saying nothing.
   */
  async dispose() {
    this.disposed = true;
    if (!this.worktreePath) return;
    const changed = await this.changedFiles().catch(() => []);
    if (changed.length > 0) return;
    await git2(this.opts.root, ["worktree", "remove", "--force", this.worktreePath]);
    if (this.branch) await git2(this.opts.root, ["branch", "-D", this.branch]);
    this.worktreePath = null;
    this.branch = null;
  }
  /**
   * Remove the worktree unconditionally, discarding any work in it.
   *
   * The branch goes too. Removing only the worktree left every commit reachable, so "discard"
   * discarded nothing that mattered and the branch accumulated on the next run.
   */
  async discard() {
    this.disposed = true;
    if (!this.worktreePath) return;
    await git2(this.opts.root, ["worktree", "remove", "--force", this.worktreePath]);
    if (this.branch) await git2(this.opts.root, ["branch", "-D", this.branch]);
    this.worktreePath = null;
    this.branch = null;
  }
};

// packages/tracker-file/src/index.ts
var import_yaml2 = __toESM(require_dist(), 1);
import { promises as fs14 } from "node:fs";
import * as path16 from "node:path";
var STATE_LABEL = {
  todo: "todo",
  in_progress: "in-progress",
  in_review: "in-review",
  done: "done",
  blocked: "blocked"
};
async function readTaskFile(filePath) {
  let raw;
  try {
    raw = await fs14.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  if (!raw.startsWith("---\n")) {
    return { frontmatter: {}, body: raw.trim(), filePath };
  }
  const close = raw.indexOf("\n---", 3);
  if (close === -1) return { frontmatter: {}, body: raw.trim(), filePath };
  const yamlSrc = raw.slice(4, close);
  const bodyStart = raw.indexOf("\n", close + 1);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1);
  let frontmatter2 = {};
  try {
    const parsed = (0, import_yaml2.parse)(yamlSrc);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter2 = parsed;
    }
  } catch {
  }
  return { frontmatter: frontmatter2, body: body.trim(), filePath };
}
function setFrontmatterField(raw, key, value) {
  const line = `${key}: ${value}`;
  if (!raw.startsWith("---\n")) return `---
${line}
---

${raw}`;
  const close = raw.indexOf("\n---", 3);
  if (close === -1) return `---
${line}
---

${raw}`;
  const front = raw.slice(4, close + 1);
  const rest = raw.slice(close + 1);
  const field = new RegExp(`^${key}:[^\\n]*$`, "m");
  return `---
${field.test(front) ? front.replace(field, line) : `${line}
${front}`}${rest}`;
}
function toArray(v) {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}
var FileTracker = class {
  constructor(opts) {
    this.opts = opts;
    this.dir = path16.resolve(opts.root, opts.dir ?? ".ctxmux/tasks");
  }
  opts;
  id = "file";
  dir;
  toSpec(file) {
    const fm = file.frontmatter;
    const id = String(fm["id"] ?? path16.basename(file.filePath).replace(/\.md$/, ""));
    const explicitAC = toArray(fm["acceptanceCriteria"]);
    const criteria = explicitAC.length > 0 ? explicitAC : extractAcceptanceCriteria(file.body);
    const scopeRaw = fm["scope"] ?? {};
    return {
      id,
      title: String(fm["title"] ?? id),
      body: file.body,
      acceptanceCriteria: criteria.map((text) => ({ text })),
      scope: {
        allow: toArray(scopeRaw["allow"]),
        deny: toArray(scopeRaw["deny"]),
        ...typeof scopeRaw["maxFiles"] === "number" ? { maxFiles: scopeRaw["maxFiles"] } : {}
      },
      qualityGate: toArray(fm["qualityGate"]).length ? toArray(fm["qualityGate"]) : this.opts.defaultQualityGate ?? [],
      origin: { tracker: "file", id, url: file.filePath },
      labels: toArray(fm["labels"]),
      ...typeof fm["priority"] === "string" ? { priority: fm["priority"] } : {},
      ...typeof fm["estimate"] === "number" ? { estimate: fm["estimate"] } : {}
    };
  }
  async files() {
    try {
      const entries = await fs14.readdir(this.dir, { withFileTypes: true });
      return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => path16.join(this.dir, e.name)).sort();
    } catch {
      return [];
    }
  }
  async listReady(limit = 10) {
    const specs = [];
    for (const filePath of await this.files()) {
      const file = await readTaskFile(filePath);
      if (!file) continue;
      const status = String(file.frontmatter["status"] ?? "todo");
      if (status !== "todo") continue;
      specs.push(this.toSpec(file));
      if (specs.length >= limit) break;
    }
    return specs;
  }
  async get(id) {
    const direct = path16.isAbsolute(id) ? id : path16.resolve(this.opts.root, id);
    for (const candidate of [direct, `${direct}.md`, path16.join(this.dir, `${id}.md`)]) {
      if (!this.withinRoot(candidate)) continue;
      const file = await readTaskFile(candidate);
      if (file) return this.toSpec(file);
    }
    for (const filePath of await this.files()) {
      const file = await readTaskFile(filePath);
      if (file && String(file.frontmatter["id"] ?? "") === id) return this.toSpec(file);
    }
    return null;
  }
  /** Rewrite the `status:` field in place, leaving the rest of the file untouched. */
  async transition(id, to) {
    const filePath = await this.resolvePath(id);
    if (!filePath) return;
    const raw = await fs14.readFile(filePath, "utf8");
    await writeFileAtomic2(filePath, setFrontmatterField(raw, "status", STATE_LABEL[to]));
  }
  /** Append to a run log beside the task, so the history is reviewable in git. */
  async comment(id, body) {
    const filePath = await this.resolvePath(id);
    if (!filePath) return;
    const logPath = filePath.replace(/\.md$/, ".log.md");
    await fs14.appendFile(logPath, `
---

${body}
`, "utf8");
  }
  async setLabels(id, add, remove) {
    const filePath = await this.resolvePath(id);
    if (!filePath) return;
    const file = await readTaskFile(filePath);
    if (!file) return;
    const current = new Set(toArray(file.frontmatter["labels"]));
    for (const l of add) current.add(l);
    for (const l of remove) current.delete(l);
    const raw = await fs14.readFile(filePath, "utf8");
    await writeFileAtomic2(filePath, setFrontmatterField(raw, "labels", `[${[...current].join(", ")}]`));
  }
  /**
   * Whether a resolved path is inside the repository this tracker was pointed at.
   *
   * An id is a string from outside — a `--task` argument, a workflow input — and both lookups
   * below resolved it against the root, so `../../elsewhere/notes.md` addressed a file in
   * another repository entirely. On `get` that reads it; on `resolvePath` it is worse, because
   * `transition` and `setLabels` then rewrite the frontmatter of whatever they found. The
   * context writer already refuses to resolve outside the root for exactly this reason.
   */
  withinRoot(candidate) {
    const root = path16.resolve(this.opts.root);
    const rel = path16.relative(root, path16.resolve(candidate));
    return rel === "" || !rel.startsWith("..") && !path16.isAbsolute(rel);
  }
  async resolvePath(id) {
    for (const candidate of [path16.join(this.dir, `${id}.md`), path16.resolve(this.opts.root, id)]) {
      if (!this.withinRoot(candidate)) continue;
      try {
        await fs14.access(candidate);
        return candidate;
      } catch {
      }
    }
    for (const filePath of await this.files()) {
      const file = await readTaskFile(filePath);
      if (file && String(file.frontmatter["id"] ?? "") === id) return filePath;
    }
    return null;
  }
};
function inlineTask(description, opts = {}) {
  const id = opts.id ?? `inline-${Date.now().toString(36)}`;
  const title = description.split("\n")[0].slice(0, 100);
  return {
    id,
    title,
    body: description,
    acceptanceCriteria: extractAcceptanceCriteria(description).map((text) => ({ text })),
    scope: { allow: [], deny: [] },
    qualityGate: opts.qualityGate ?? [],
    origin: { tracker: "inline", id },
    labels: []
  };
}

// packages/forge-github/src/client.ts
import { spawn as spawn3 } from "node:child_process";
function run(bin, args, input) {
  return new Promise((resolve17) => {
    const child = spawn3(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => stdout += d);
    child.stderr.on("data", (d) => stderr += d);
    child.on("error", (err) => resolve17({ code: 127, stdout, stderr: String(err) }));
    child.on("close", (code) => resolve17({ code: code ?? 1, stdout, stderr }));
    child.stdin.on("error", () => {
    });
    if (input !== void 0) child.stdin.write(input);
    child.stdin.end();
  });
}
var GitHubApiError = class extends Error {
  constructor(message, status, path26) {
    super(message);
    this.status = status;
    this.path = path26;
  }
  status;
  path;
  name = "GitHubApiError";
};
function redact(text) {
  return text.replace(/gh[pousr]_[A-Za-z0-9]{16,}/g, "[REDACTED]").replace(/github_pat_[A-Za-z0-9_]{20,}/g, "[REDACTED]").replace(/(["']?(?:token|authorization|password|secret|key)["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, "$1[REDACTED]");
}
var TokenClient = class {
  constructor(opts) {
    this.opts = opts;
    this.baseUrl = opts.baseUrl ?? "https://api.github.com";
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? ((ms2) => new Promise((r) => setTimeout(r, ms2)));
  }
  opts;
  baseUrl;
  fetchImpl;
  sleep;
  async request(method, url, body, path26, idempotent) {
    const maxAttempts = idempotent ? this.opts.maxAttempts ?? 3 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.opts.token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        ...body === void 0 ? {} : { body: JSON.stringify(body) }
      });
      if (res.status === 429 || res.status >= 500 && idempotent) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1e3 : 2 ** attempt * 500;
        if (attempt < maxAttempts) {
          await this.sleep(waitMs);
          continue;
        }
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new GitHubApiError(
          `HTTP ${res.status}: ${redact(text).slice(0, 300)}`,
          res.status,
          path26
        );
      }
      if (res.status === 204) return void 0;
      return await res.json();
    }
    throw new GitHubApiError("request failed", 0, path26);
  }
  async rest(method, path26, body) {
    return this.request(method, `${this.baseUrl}/${path26}`, body, path26, method === "GET");
  }
  async raw(path26, accept) {
    const res = await this.fetchImpl(`${this.baseUrl}/${path26}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.opts.token}`, Accept: accept }
    });
    if (!res.ok) throw new GitHubApiError(`HTTP ${res.status}`, res.status, path26);
    return res.text();
  }
  async graphql(query, variables = {}, headers = {}) {
    const res = await this.fetchImpl(`${this.baseUrl}/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.token}`,
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify({ query, variables })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new GitHubApiError(
        `HTTP ${res.status}: ${redact(text).slice(0, 300)}`,
        res.status,
        "graphql"
      );
    }
    const json = await res.json().catch(() => null);
    if (!json) throw new GitHubApiError("GraphQL response was not JSON", res.status, "graphql");
    if (json.errors?.length) {
      throw new GitHubApiError(redact(json.errors.map((e) => e.message).join("; ")), res.status, "graphql");
    }
    if (json.data === void 0) {
      throw new GitHubApiError("GraphQL response carried no data", res.status, "graphql");
    }
    return json.data;
  }
};
var GhCliClient = class {
  constructor(bin = "gh") {
    this.bin = bin;
  }
  bin;
  static async available(bin = "gh") {
    const res = await run(bin, ["auth", "status"]);
    if (res.code === 127) return { ok: false, detail: `\`${bin}\` is not installed` };
    if (res.code !== 0) return { ok: false, detail: "not authenticated \u2014 run `gh auth login`" };
    const account = /account (\S+)/.exec(res.stdout + res.stderr)?.[1];
    return { ok: true, detail: account ? `authenticated as ${account}` : "authenticated" };
  }
  async run(args, input) {
    const res = await run(this.bin, args, input);
    if (res.code !== 0) {
      throw new GitHubApiError(redact(res.stderr || "gh failed"), 0, args.join(" "));
    }
    return res.stdout;
  }
  async rest(method, path26, body) {
    const args = ["api", "--method", method, path26];
    if (body !== void 0) args.push("--input", "-");
    const out = await this.run(args, body === void 0 ? void 0 : JSON.stringify(body));
    return out.trim() ? JSON.parse(out) : void 0;
  }
  async raw(path26, accept) {
    return this.run(["api", "-H", `Accept: ${accept}`, path26]);
  }
  async graphql(query, variables = {}, headers = {}) {
    const args = ["api", "graphql", "--input", "-"];
    for (const [k, v] of Object.entries(headers)) args.push("-H", `${k}: ${v}`);
    const out = await this.run(args, JSON.stringify({ query, variables }));
    const json = JSON.parse(out);
    if (json.errors?.length) {
      throw new GitHubApiError(redact(json.errors.map((e) => e.message).join("; ")), 0, "graphql");
    }
    return json.data;
  }
};
async function resolveClient(opts = {}) {
  const token = opts.token ?? process.env["GITHUB_TOKEN"] ?? process.env["GH_TOKEN"];
  if (token) {
    return {
      client: new TokenClient({ token, ...opts.baseUrl ? { baseUrl: opts.baseUrl } : {} }),
      source: "GITHUB_TOKEN"
    };
  }
  const gh = await GhCliClient.available();
  if (gh.ok) return { client: new GhCliClient(), source: `gh CLI (${gh.detail})` };
  throw new GitHubApiError(
    `No GitHub credentials. Set GITHUB_TOKEN, or run \`gh auth login\`. (${gh.detail})`,
    401,
    "auth"
  );
}

// packages/forge-github/src/index.ts
function isRedirect(err) {
  const status = err.status;
  if (status === 301 || status === 307 || status === 308) return true;
  return /HTTP 30[178]\b/.test(err?.message ?? "");
}
function parseRepo(value) {
  const m = /^([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(value.trim());
  if (!m) throw new GitHubApiError(`Not a valid repository: "${value}". Expected "owner/repo".`, 0, "parse");
  return { owner: m[1], repo: m[2] };
}
function toPullRequest(raw) {
  return {
    number: raw.number,
    nodeId: raw.node_id,
    title: raw.title,
    body: raw.body ?? "",
    state: raw.state,
    merged: raw.merged ?? false,
    draft: raw.draft ?? false,
    author: raw.user.login,
    url: raw.html_url,
    branch: raw.head.ref,
    changedFiles: raw.changed_files ?? 0,
    updatedAt: raw.updated_at,
    requestedReviewers: (raw.requested_reviewers ?? []).map((r) => r.login)
  };
}
function toIssue(raw) {
  return {
    number: raw.number,
    nodeId: raw.node_id,
    title: raw.title,
    body: raw.body ?? "",
    state: raw.state,
    labels: raw.labels.map((l) => typeof l === "string" ? l : l.name),
    url: raw.html_url,
    assignees: (raw.assignees ?? []).map((a) => a.login),
    updatedAt: raw.updated_at
  };
}
var GitHubForge = class {
  constructor(client, ref) {
    this.client = client;
    this.ref = ref;
  }
  client;
  ref;
  id = "github";
  /**
   * Every request, with a redirect turned into an answer.
   *
   * Renaming a GitHub organisation leaves a redirect behind. Reads follow it silently, so
   * everything looks configured correctly — `gh api repos/old/name` returns the repository,
   * preflight passes, the task is fetched. Writes do not follow it: creating the issue comes
   * back `HTTP 307`, which is all the user sees, after every other step has reported success.
   *
   * The canonical name is knowable, because the redirect that broke the write also makes the
   * read work. So it is looked up and named.
   */
  async rest(method, path26, body) {
    try {
      return await this.client.rest(method, path26, body);
    } catch (err) {
      if (!isRedirect(err) || method === "GET") throw err;
      const moved = await this.canonicalName().catch(() => null);
      throw new GitHubApiError(
        `${this.ref.owner}/${this.ref.repo} has moved${moved ? ` to ${moved}` : ""}. Reads follow the redirect but writes do not, which is why everything up to this point worked. Set CTXMUX_REPO${moved ? ` to ${moved}` : " to the new owner/name"}, or pass --repo.`,
        307,
        path26
      );
    }
  }
  /** The repository's current owner/name, resolved through the redirect a read follows. */
  async canonicalName() {
    const raw = await this.client.rest("GET", this.base);
    return raw?.full_name ?? null;
  }
  get base() {
    return `repos/${this.ref.owner}/${this.ref.repo}`;
  }
  // --- issues -------------------------------------------------------------
  async createIssue(input) {
    const raw = await this.rest("POST", `${this.base}/issues`, {
      title: input.title,
      body: input.body,
      ...input.labels?.length ? { labels: input.labels } : {}
    });
    return toIssue(raw);
  }
  async getIssue(number) {
    try {
      return toIssue(await this.client.rest("GET", `${this.base}/issues/${number}`));
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) return null;
      throw err;
    }
  }
  /**
   * Issues carrying a label, excluding pull requests.
   *
   * GitHub's issues endpoint returns pull requests too, which is a long-standing trap: a
   * caller that forgets to filter ends up treating its own agent's PR as a new task.
   */
  async listIssues(opts = {}) {
    const params = new URLSearchParams({
      state: opts.state ?? "open",
      per_page: String(Math.min(opts.limit ?? 30, 100))
    });
    if (opts.labels?.length) params.set("labels", opts.labels.join(","));
    const raw = await this.client.rest("GET", `${this.base}/issues?${params}`);
    return raw.filter((r) => !r.pull_request).map(toIssue);
  }
  async comment(issueNumber2, body) {
    await this.rest("POST", `${this.base}/issues/${issueNumber2}/comments`, { body });
  }
  async setLabels(issueNumber2, add, remove) {
    if (add.length > 0) {
      await this.rest("POST", `${this.base}/issues/${issueNumber2}/labels`, { labels: add });
    }
    for (const label of remove) {
      try {
        await this.rest("DELETE", `${this.base}/issues/${issueNumber2}/labels/${encodeURIComponent(label)}`);
      } catch (err) {
        if (!(err instanceof GitHubApiError && err.status === 404)) throw err;
      }
    }
  }
  async closeIssue(number, reason = "completed") {
    await this.rest("PATCH", `${this.base}/issues/${number}`, {
      state: "closed",
      state_reason: reason
    });
  }
  // --- pull requests ------------------------------------------------------
  /**
   * Pull requests that would close an issue.
   *
   * Deliberately GraphQL: matching by branch name or title is how hand-rolled pipelines get
   * this wrong, because agents name branches however they like. The linked-PR relationship is
   * the only reliable signal, and it is not exposed over REST.
   */
  async linkedPullRequests(issueNumber2) {
    const data = await this.client.graphql(
      `query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            closedByPullRequestsReferences(first: 10, includeClosedPrs: true) {
              nodes {
                number id title body state merged isDraft url headRefName changedFiles updatedAt
                author { login }
                reviewRequests(first: 20) { nodes { requestedReviewer { ... on User { login } } } }
              }
            }
          }
        }
      }`,
      { owner: this.ref.owner, repo: this.ref.repo, number: issueNumber2 }
    );
    const nodes = data?.repository?.issue?.closedByPullRequestsReferences?.nodes ?? [];
    return nodes.map((n) => ({
      number: n.number,
      nodeId: n.id,
      title: n.title,
      body: n.body ?? "",
      state: n.state === "OPEN" ? "open" : "closed",
      merged: n.merged,
      draft: n.isDraft,
      author: n.author?.login ?? "unknown",
      url: n.url,
      branch: n.headRefName,
      changedFiles: n.changedFiles,
      updatedAt: n.updatedAt,
      requestedReviewers: (n.reviewRequests?.nodes ?? []).map((r) => r.requestedReviewer?.login).filter((login) => Boolean(login))
    }));
  }
  async getPullRequest(number) {
    try {
      return toPullRequest(await this.client.rest("GET", `${this.base}/pulls/${number}`));
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) return null;
      throw err;
    }
  }
  /**
   * Open a pull request for work that already exists on a branch.
   *
   * A delegated agent opens its own; a driven one does not, because it only ever had a working
   * tree. Without this its output lived on a branch in a temporary worktree and nothing ever
   * published it — which on a CI runner meant the work was destroyed with the machine.
   */
  async createPullRequest(input) {
    const raw = await this.rest("POST", `${this.base}/pulls`, {
      title: input.title,
      head: input.head,
      base: input.base,
      body: input.body,
      ...input.draft !== void 0 ? { draft: input.draft } : {}
    });
    return toPullRequest(raw);
  }
  /**
   * Every file a pull request touches.
   *
   * Fully paginated (see `paginate`), because this list is what a scope check reads and a
   * truncated deny-list check reports a clean verdict rather than a smaller one.
   */
  async pullRequestFiles(number) {
    const raw = await this.paginate(
      `${this.base}/pulls/${number}/files`,
      `pull request #${number} changes`
    );
    return raw.map((f) => f.filename);
  }
  /**
   * Read every page, or refuse.
   *
   * Shared because the reasoning is the same wherever it applies, and because it was applied in
   * one place and forgotten in two. A truncated list does not report a smaller answer — it
   * reports a clean one, which is the wrong direction for anything feeding a decision to be
   * wrong in. The page ceiling is a backstop against an unbounded loop, and it says so rather
   * than returning what it managed to collect.
   */
  async paginate(path26, what, maxPages = 30) {
    const out = [];
    const join22 = path26.includes("?") ? "&" : "?";
    for (let page = 1; page <= maxPages; page++) {
      const raw = await this.client.rest("GET", `${path26}${join22}per_page=100&page=${page}`);
      out.push(...raw);
      if (raw.length < 100) return out;
    }
    throw new GitHubApiError(
      `${what} more than ${maxPages * 100} items; refusing to report a partial list`,
      0,
      path26
    );
  }
  /**
   * The open pull request for a branch, if there is one.
   *
   * Re-running a task is ordinary — a workflow re-dispatched, a run resumed — and the second
   * attempt pushes to the same branch. GitHub answers a duplicate create with a 422 whose
   * message names the branch but not the pull request, so without this a re-run reports a
   * failure for work that was published perfectly well the first time.
   */
  async findPullRequestByBranch(branch) {
    const head = encodeURIComponent(`${this.ref.owner}:${branch}`);
    const raw = await this.client.rest(
      "GET",
      `${this.base}/pulls?head=${head}&state=open&per_page=1`
    );
    return raw.length > 0 ? toPullRequest(raw[0]) : null;
  }
  /**
   * The unified diff for a pull request.
   *
   * Requested by media type, not by a `.diff` suffix on the path. The API ignores the suffix
   * and answers with the pull request's JSON — which `rest<string>` then asserted was a string,
   * because a generic nobody checks will describe an object as anything you like. That object
   * reached `test-integrity`, and the run died on `diff.split is not a function` after the
   * agent had finished and the dependencies had been installed.
   *
   * The type is checked on the way out for the same reason: this is the boundary where a wrong
   * shape stops being detectable.
   */
  async pullRequestDiff(number) {
    try {
      const raw = this.client.raw ? await this.client.raw(`${this.base}/pulls/${number}`, "application/vnd.github.diff") : await this.client.rest("GET", `${this.base}/pulls/${number}.diff`);
      return typeof raw === "string" ? raw : "";
    } catch {
      return "";
    }
  }
  async listReviews(number) {
    const raw = await this.paginate(`${this.base}/pulls/${number}/reviews`, `pull request #${number} has`);
    return raw.map((r) => ({
      id: r.id,
      author: r.user.login,
      state: r.state,
      body: r.body ?? "",
      submittedAt: r.submitted_at
    }));
  }
  async listReviewComments(number) {
    const raw = await this.paginate(`${this.base}/pulls/${number}/comments`, `pull request #${number} has`);
    return raw.map((c2) => ({
      id: c2.id,
      author: c2.user.login,
      body: c2.body,
      path: c2.path,
      line: c2.line,
      createdAt: c2.created_at
    }));
  }
  async commentOnPullRequest(number, body) {
    await this.comment(number, body);
  }
  async markReadyForReview(nodeId) {
    await this.client.graphql(
      `mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { clientMutationId } }`,
      { id: nodeId }
    );
  }
};
function reviewToFeedback(reviews, comments, opts) {
  const bots = new Set([...opts.botLogins ?? [], "github-actions[bot]"].map((b) => b.toLowerCase()));
  const isHuman = (login) => !bots.has(login.toLowerCase()) && !login.endsWith("[bot]");
  const changeRequests = reviews.filter((r) => r.state === "CHANGES_REQUESTED" && isHuman(r.author));
  const humanComments = comments.filter((c2) => isHuman(c2.author));
  if (changeRequests.length === 0 && humanComments.length === 0) return null;
  const bodies = changeRequests.map((r) => r.body).filter(Boolean);
  return {
    round: opts.round,
    source: changeRequests[0]?.author ?? humanComments[0]?.author ?? "reviewer",
    body: bodies.join("\n\n") || "Changes were requested on the pull request.",
    ...humanComments.length ? {
      items: humanComments.map((c2) => ({
        file: c2.path,
        ...c2.line !== null ? { line: c2.line } : {},
        body: c2.body
      }))
    } : {}
  };
}

// packages/agent-copilot/src/index.ts
var COPILOT_LOGINS = ["Copilot", "copilot-swe-agent[bot]", "github-copilot[bot]"];
var FEATURE_HEADER = { "GraphQL-Features": "issues_copilot_assignment_api_support" };
var CopilotAgent = class _CopilotAgent {
  constructor(opts) {
    this.opts = opts;
    this.forge = new GitHubForge(opts.client, opts.repo);
    this.pollIntervalMs = opts.pollIntervalMs ?? 3e4;
  }
  opts;
  kind = "delegated";
  id = "copilot";
  displayName = "GitHub Copilot coding agent";
  capabilities = {
    promptControl: "artifact-only",
    resume: "mention",
    sandbox: "vendor",
    budgetable: false
  };
  pollIntervalMs;
  forge;
  actorId = null;
  /**
   * When each handle was last nudged.
   *
   * `observe` has no other way to tell "the work Copilot did" from "the work Copilot did before
   * we asked for changes" — the pull request looks identical either way. Without this, a
   * revision round resolved on the very first poll against the unchanged pull request: the
   * gates failed again on the same content, the run spent every round it had, and it escalated
   * without Copilot ever having seen the feedback.
   *
   * Held in memory, which covers the case that was broken — `ctxmux run`, where the nudge and the
   * observation happen in one process. A webhook-driven service restarts between the two and
   * falls back to the previous behaviour, so it should drive the run through `submit` rather
   * than by polling.
   */
  nudgedAt = /* @__PURE__ */ new Map();
  /**
   * Resolve Copilot's assignable actor id for *this* repository.
   *
   * Discovered every time rather than cached across installations, and failing loudly when
   * absent. A hard-coded fallback would turn "Copilot is not enabled on this repository" into
   * a mutation that appears to succeed and assigns nothing.
   */
  async resolveActorId() {
    if (this.actorId) return this.actorId;
    const data = await this.opts.client.graphql(
      `query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {
            nodes { __typename login ... on Bot { id } }
          }
        }
      }`,
      { owner: this.opts.repo.owner, repo: this.opts.repo.repo },
      FEATURE_HEADER
    );
    const actor = (data?.repository?.suggestedActors?.nodes ?? []).find(
      (a) => a.__typename === "Bot" && a.login?.toLowerCase().includes("copilot") && a.id
    );
    if (!actor?.id) {
      throw new GitHubApiError(
        "Copilot is not available as an assignee on this repository. Enable the Copilot coding agent in repository settings, and check the token has access to it.",
        403,
        "suggestedActors"
      );
    }
    this.actorId = actor.id;
    return actor.id;
  }
  async preflight() {
    try {
      const id = await this.resolveActorId();
      return { ok: true, detail: `Copilot is assignable on this repository (${id})` };
    } catch (err) {
      return { ok: false, detail: err.message };
    }
  }
  /**
   * The most a GitHub issue body will hold.
   *
   * Exceeding it is a 422 from the create call, which arrives after preflight has passed and
   * reported everything fine — so the run looks healthy right up until the one step that was
   * always going to fail. Checked here because this is the last place that knows both the
   * artefact and where it is going.
   */
  static MAX_BODY = 65536;
  async delegate(input) {
    if (input.prompt.length > _CopilotAgent.MAX_BODY) {
      throw new GitHubApiError(
        `the artefact for ${input.task.id} is ${input.prompt.length.toLocaleString()} characters, and a GitHub issue body holds ${_CopilotAgent.MAX_BODY.toLocaleString()}. Narrow the task's scope, or lower --repo-budget, so less of the repository is described in it.`,
        422,
        "issues"
      );
    }
    const actorId = await this.resolveActorId();
    const issue = await this.forge.createIssue({
      title: `[${input.task.id}] ${input.task.title}`,
      body: input.prompt,
      labels: [this.opts.label ?? "contextmux", `task:${input.task.id}`]
    });
    try {
      await this.opts.client.graphql(
        `mutation($assignableId: ID!, $actorIds: [ID!]!) {
          replaceActorsForAssignable(input: { assignableId: $assignableId, actorIds: $actorIds }) {
            clientMutationId
          }
        }`,
        { assignableId: issue.nodeId, actorIds: [actorId] },
        FEATURE_HEADER
      );
    } catch (err) {
      await this.forge.comment(issue.number, `Could not assign Copilot: ${err.message}. Closing.`).catch(() => {
      });
      await this.forge.closeIssue(issue.number, "not_planned").catch(() => {
      });
      throw err;
    }
    return { ref: String(issue.number), agentId: this.id };
  }
  async nudge(handle, feedback) {
    const issueNumber2 = Number(handle.ref);
    const prs = await this.forge.linkedPullRequests(issueNumber2);
    const target = prs.find((p) => p.state === "open");
    const body = [
      `@copilot Revision round ${feedback.round} \u2014 from ${feedback.source}:`,
      "",
      feedback.body,
      ...feedback.items?.length ? ["", ...feedback.items.map((i) => `- \`${i.file}${i.line ? `:${i.line}` : ""}\` \u2014 ${i.body}`)] : [],
      "",
      "Address exactly this. Do not make unrelated changes."
    ].join("\n");
    await this.forge.comment(target?.number ?? issueNumber2, body);
    const after = target ? await this.forge.getPullRequest(target.number).catch(() => null) : null;
    const stamp = after ? Date.parse(after.updatedAt) : NaN;
    this.nudgedAt.set(handle.ref, Number.isFinite(stamp) ? stamp : Date.now());
  }
  /**
   * Has the agent produced anything yet?
   *
   * A draft pull request means work is still in progress. Treating a draft as finished is the
   * classic mistake here: it sends a half-written change to review, and the agent keeps
   * pushing to it afterwards.
   */
  async observe(handle) {
    const issueNumber2 = Number(handle.ref);
    if (!Number.isFinite(issueNumber2)) {
      return { status: "failed", filesChanged: [], summary: "", error: `invalid handle "${handle.ref}"` };
    }
    const prs = await this.forge.linkedPullRequests(issueNumber2);
    if (prs.length === 0) return null;
    const pr = prs.find((p) => p.state === "open") ?? prs[0];
    if (pr.state === "open" && pr.draft && pr.requestedReviewers.length === 0) return null;
    const nudged = this.nudgedAt.get(handle.ref);
    if (nudged !== void 0 && pr.state === "open") {
      const updated = Date.parse(pr.updatedAt);
      if (!Number.isFinite(updated) || updated <= nudged) return null;
      this.nudgedAt.delete(handle.ref);
    }
    if (pr.state === "closed" && !pr.merged) {
      return {
        status: "failed",
        filesChanged: [],
        summary: pr.body,
        error: `pull request #${pr.number} was closed without merging`,
        location: { prUrl: pr.url, branch: pr.branch }
      };
    }
    let files;
    try {
      files = await this.forge.pullRequestFiles(pr.number);
    } catch (err) {
      return {
        status: "failed",
        filesChanged: [],
        summary: pr.body || pr.title,
        error: `could not read the files changed by #${pr.number}: ${err.message}`,
        location: { prUrl: pr.url, branch: pr.branch }
      };
    }
    const diff = await this.forge.pullRequestDiff(pr.number).catch(() => "");
    return {
      status: "succeeded",
      filesChanged: files,
      ...diff ? { diff } : {},
      summary: pr.body || pr.title,
      location: { prUrl: pr.url, branch: pr.branch }
    };
  }
  /** The pull request a run produced, for reporting and for review handling. */
  async pullRequestFor(handle) {
    const prs = await this.forge.linkedPullRequests(Number(handle.ref));
    return prs.find((p) => p.state === "open") ?? prs[0] ?? null;
  }
  /**
   * Clear the draft flag on the pull request the agent produced.
   *
   * Copilot never does this itself: it commits, requests a review, and leaves the draft set.
   * So a run whose gates have passed still reads as unfinished to everyone looking at the
   * repository — the ticket says in review, the pull request says work in progress, and the
   * reviewer it asked for cannot merge what it has written.
   *
   * Returns null rather than throwing when there is nothing to mark. A pull request that is
   * already open for review is the desired end state, not a failure, and losing a completed
   * run over it would be the wrong trade.
   */
  async markReady(handle) {
    const pr = await this.pullRequestFor(handle);
    if (!pr || !pr.draft) return null;
    await this.forge.markReadyForReview(pr.nodeId);
    return pr.url;
  }
  /** Collect human review feedback on the run's pull request, if any has arrived. */
  async collectReviewFeedback(handle, round) {
    const pr = await this.pullRequestFor(handle);
    if (!pr) return null;
    const [reviews, comments] = await Promise.all([
      this.forge.listReviews(pr.number),
      this.forge.listReviewComments(pr.number)
    ]);
    return reviewToFeedback(reviews, comments, { round, botLogins: COPILOT_LOGINS });
  }
};
function copilotAgent(opts) {
  return new CopilotAgent(opts);
}

// packages/agent-cursor/src/index.ts
var CURSOR_SPEC = {
  id: "cursor",
  displayName: "Cursor Agent",
  bin: "cursor-agent",
  confidence: "unverified",
  capabilities: {
    promptControl: "full",
    resume: "session",
    sandbox: "caller",
    /*
     * Not budgetable.
     *
     * Nothing observed here reports per-run cost, and claiming otherwise would let a caller
     * set a ceiling that is silently never applied — worse than having no ceiling, because
     * they would believe they had one.
     */
    budgetable: false
  },
  invoke({ prompt, resumeSessionId, systemPrompt, model, isolated, extraArgs }) {
    const args = ["--print", "--output-format", "json"];
    if (model) args.push("--model", model);
    if (isolated) args.push("--force");
    if (resumeSessionId) args.push("--resume", resumeSessionId);
    if (extraArgs?.length) args.push(...extraArgs);
    args.push(`${systemPrompt}

---

${prompt}`);
    return { args };
  },
  parse(stdout, stderr, exitCode) {
    const json = extractJson(stdout);
    if (json) {
      const text = typeof json["result"] === "string" && json["result"] || typeof json["response"] === "string" && json["response"] || typeof json["text"] === "string" && json["text"] || "";
      if (text) {
        const usageRaw = json["usage"];
        const usage = {
          ...typeof usageRaw?.["input_tokens"] === "number" ? { inputTokens: usageRaw["input_tokens"] } : {},
          ...typeof usageRaw?.["output_tokens"] === "number" ? { outputTokens: usageRaw["output_tokens"] } : {}
        };
        return {
          text,
          ...typeof json["session_id"] === "string" ? { sessionId: json["session_id"] } : typeof json["chatId"] === "string" ? { sessionId: json["chatId"] } : {},
          ...Object.keys(usage).length ? { usage } : {},
          ...json["is_error"] === true || json["error"] ? { isError: true } : {}
        };
      }
      if (json["is_error"] === true || json["error"]) {
        return { text: String(json["error"] ?? "the agent reported an error"), isError: true };
      }
    }
    const streamed = textFromStream(stdout);
    if (streamed) return { text: streamed };
    if (exitCode === 0 && stdout.trim()) return { text: stdout.trim() };
    if (exitCode !== 0 && stderr.trim()) return { text: stderr.trim(), isError: true };
    return null;
  }
};
var CursorAgent = class extends CliAgent {
  constructor(opts = {}) {
    const spec = opts.outputFormat ? {
      ...CURSOR_SPEC,
      invoke: (input) => {
        const built = CURSOR_SPEC.invoke(input);
        const args = [...built.args];
        const at = args.indexOf("--output-format");
        if (at >= 0) args[at + 1] = opts.outputFormat;
        return { ...built, args };
      }
    } : CURSOR_SPEC;
    super(spec, opts);
  }
};
function cursorAgent(opts = {}) {
  return new CursorAgent(opts);
}

// packages/agent-codex/src/index.ts
var CODEX_SPEC = {
  id: "codex",
  displayName: "Codex",
  bin: "codex",
  confidence: "unverified",
  capabilities: {
    promptControl: "full",
    /*
     * `codex exec` is a batch invocation rather than a resumable conversation, so a revision
     * round re-invokes with the feedback rather than continuing a session. Declaring
     * `reinvoke` is what makes the orchestrator hand over the full context each time instead
     * of assuming the agent remembers the previous round.
     */
    resume: "reinvoke",
    sandbox: "caller",
    budgetable: false
  },
  invoke({ prompt, systemPrompt, model, isolated, extraArgs }) {
    const args = ["exec", "--json"];
    if (model) args.push("--model", model);
    args.push("--sandbox", isolated ? "workspace-write" : "read-only");
    if (extraArgs?.length) args.push(...extraArgs);
    args.push(`${systemPrompt}

---

${prompt}`);
    return { args };
  },
  parse(stdout, stderr, exitCode) {
    let lastMessage = "";
    let sawError = false;
    const usage = {};
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) continue;
      try {
        const event = JSON.parse(trimmed);
        const type = String(event["type"] ?? event["msg"] ?? "");
        if (type.includes("agent_message") || type === "message") {
          const message = event["message"] ?? event["text"] ?? event["content"];
          if (typeof message === "string") lastMessage = message;
        }
        if (type.includes("error")) sawError = true;
        const tokens = event["token_usage"] ?? event["usage"];
        if (tokens && typeof tokens === "object") {
          const t = tokens;
          if (typeof t["input_tokens"] === "number") usage.inputTokens = t["input_tokens"];
          if (typeof t["output_tokens"] === "number") usage.outputTokens = t["output_tokens"];
        }
      } catch {
      }
    }
    if (lastMessage) {
      return {
        text: lastMessage,
        ...Object.keys(usage).length ? { usage } : {},
        ...sawError ? { isError: true } : {}
      };
    }
    const json = extractJson(stdout);
    if (json) {
      const text = typeof json["last_agent_message"] === "string" && json["last_agent_message"] || typeof json["result"] === "string" && json["result"] || "";
      if (text) return { text, ...json["error"] ? { isError: true } : {} };
    }
    if (exitCode === 0 && stdout.trim()) return { text: stdout.trim() };
    if (exitCode !== 0 && stderr.trim()) return { text: stderr.trim(), isError: true };
    return null;
  }
};
var CodexAgent = class extends CliAgent {
  constructor(opts = {}) {
    const spec = opts.sandbox ? {
      ...CODEX_SPEC,
      invoke: (input) => {
        const built = CODEX_SPEC.invoke(input);
        const args = [...built.args];
        const at = args.indexOf("--sandbox");
        if (at >= 0) args[at + 1] = opts.sandbox;
        return { ...built, args };
      }
    } : CODEX_SPEC;
    super(spec, opts);
  }
};
function codexAgent(opts = {}) {
  return new CodexAgent(opts);
}

// packages/agent-local/src/index.ts
var DEFAULT_RUNNER_URL = "http://localhost:11434";
var AIDER_SPEC = {
  id: "local-aider",
  displayName: "Local model (aider)",
  bin: "aider",
  confidence: "unverified",
  capabilities: {
    promptControl: "full",
    // aider's headless mode is one message per invocation, so a revision round re-invokes.
    resume: "reinvoke",
    sandbox: "caller",
    /*
     * Not budgetable, and for a happier reason than usual: a locally-hosted model has no
     * per-token cost to cap. Claiming otherwise would let a caller set a ceiling that is
     * never applied.
     */
    budgetable: false
  },
  invoke({ prompt, systemPrompt, model, isolated, extraArgs }) {
    const args = [
      "--message",
      `${systemPrompt}

---

${prompt}`,
      // Unattended: never wait for a human that is not there.
      "--yes-always",
      // Leave the change in the working tree for the runner to read.
      "--no-auto-commits",
      // Plain output; the pretty renderer emits control codes that parse badly.
      "--no-pretty",
      "--no-stream"
    ];
    if (model) args.push("--model", model);
    if (!isolated) args.push("--no-auto-lint", "--dry-run");
    if (extraArgs?.length) args.push(...extraArgs);
    return { args };
  },
  parse(stdout, stderr, exitCode) {
    const text = stdout.trim();
    if (exitCode === 0 && text) return { text };
    if (exitCode !== 0) {
      const detail = (stderr || stdout).trim().split("\n").slice(-10).join("\n");
      return { text: detail || `exited with ${exitCode}`, isError: true };
    }
    return null;
  }
};
var OPENCODE_SPEC = {
  id: "local-opencode",
  displayName: "Local model (opencode)",
  bin: "opencode",
  confidence: "unverified",
  capabilities: {
    promptControl: "full",
    resume: "reinvoke",
    sandbox: "caller",
    budgetable: false
  },
  invoke({ prompt, systemPrompt, model, extraArgs }) {
    const args = ["run", `${systemPrompt}

---

${prompt}`];
    if (model) args.push("--model", model);
    if (extraArgs?.length) args.push(...extraArgs);
    return { args };
  },
  parse(stdout, stderr, exitCode) {
    const text = stdout.trim();
    if (exitCode === 0 && text) return { text };
    if (exitCode !== 0) return { text: (stderr || stdout).trim().slice(-2e3), isError: true };
    return null;
  }
};
var SPECS = {
  aider: AIDER_SPEC,
  opencode: OPENCODE_SPEC
};
var LocalAgent = class extends CliAgent {
  runnerUrl;
  constructor(opts = {}) {
    const harness = opts.harness ?? "aider";
    super(SPECS[harness], {
      ...opts,
      model: opts.model ?? process.env["CTXMUX_LOCAL_MODEL"] ?? "ollama/qwen2.5-coder"
    });
    this.runnerUrl = opts.runnerUrl ?? process.env["OLLAMA_HOST"] ?? DEFAULT_RUNNER_URL;
  }
  /**
   * Check both halves, and say which is missing.
   *
   * "Ollama is installed but not running" is a common and genuinely confusing state: the
   * binary answers `--version`, so a check that stopped at the harness would report everything
   * fine and then fail on the first request with a connection error nobody expects.
   */
  async preflight() {
    const harness = await super.preflight();
    if (!harness.ok) {
      return {
        ok: false,
        detail: `${harness.detail} A local model needs a harness as well as a runner \u2014 ollama serves tokens but does not read or edit files. Install aider (Apache-2.0) or opencode (MIT).`
      };
    }
    const model = this.opts.model ?? "";
    if (!model.startsWith("ollama/")) return harness;
    const reachable = await fetch(`${this.runnerUrl}/api/tags`, {
      signal: AbortSignal.timeout(2e3)
    }).then(
      (r) => r.ok,
      () => false
    );
    if (!reachable) {
      return {
        ok: false,
        detail: `${this.displayName} is installed, but no model runner is answering at ${this.runnerUrl}. Start it with \`ollama serve\`, and pull a model with \`ollama pull qwen2.5-coder\`.`
      };
    }
    return { ok: true, detail: `${harness.detail}, model ${model} via ${this.runnerUrl}` };
  }
};
function localAgent(opts = {}) {
  return new LocalAgent(opts);
}

// packages/tracker-github/src/index.ts
var STATE_LABELS = {
  todo: "state:todo",
  in_progress: "state:in-progress",
  in_review: "state:in-review",
  done: "state:done",
  blocked: "state:blocked"
};
function issueNumber(id) {
  if (!/^\d+$/.test(id.trim())) return null;
  const n = Number(id.trim());
  return n > 0 ? n : null;
}
var GitHubTracker = class {
  constructor(opts) {
    this.opts = opts;
    this.forge = new GitHubForge(opts.client, opts.repo);
  }
  opts;
  id = "github";
  forge;
  toSpec(issue) {
    const id = String(issue.number);
    return {
      id,
      title: issue.title,
      body: issue.body,
      acceptanceCriteria: extractAcceptanceCriteria(issue.body).map((text) => ({ text })),
      scope: {
        allow: this.opts.defaultScope?.allow ?? [],
        deny: this.opts.defaultScope?.deny ?? [],
        ...this.opts.defaultScope?.maxFiles !== void 0 ? { maxFiles: this.opts.defaultScope.maxFiles } : {}
      },
      qualityGate: this.opts.defaultQualityGate ?? [],
      origin: { tracker: "github", id, url: issue.url },
      // State labels are bookkeeping, not user intent, so they do not reach gate decisions.
      labels: issue.labels.filter((l) => !l.startsWith("state:"))
    };
  }
  async listReady(limit = 10) {
    const labels = this.opts.label ? [this.opts.label] : [];
    const issues = await this.forge.listIssues({ labels, state: "open", limit: limit * 2 });
    return issues.filter((i) => !i.labels.some((l) => l.startsWith("state:") && l !== STATE_LABELS.todo)).slice(0, limit).map((i) => this.toSpec(i));
  }
  async get(id) {
    const number = issueNumber(id);
    if (number === null) return null;
    const issue = await this.forge.getIssue(number);
    return issue ? this.toSpec(issue) : null;
  }
  async transition(id, to) {
    const number = issueNumber(id);
    if (number === null) return;
    const target = STATE_LABELS[to];
    const stale = Object.values(STATE_LABELS).filter((l) => l !== target);
    await this.forge.setLabels(number, [target], stale);
    if (to === "done") await this.forge.closeIssue(number, "completed");
  }
  async comment(id, body) {
    const number = issueNumber(id);
    if (number !== null) await this.forge.comment(number, body);
  }
  async setLabels(id, add, remove) {
    const number = issueNumber(id);
    if (number !== null) await this.forge.setLabels(number, add, remove);
  }
};

// packages/tracker-jira/src/adf.ts
function applyMarks(text, marks) {
  if (!marks?.length) return text;
  let out = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "strong":
        out = `**${out}**`;
        break;
      case "em":
        out = `_${out}_`;
        break;
      case "code":
        out = `\`${out}\``;
        break;
      case "strike":
        out = `~~${out}~~`;
        break;
      case "link": {
        const href = mark.attrs?.["href"];
        if (typeof href === "string") out = `[${out}](${href})`;
        break;
      }
    }
  }
  return out;
}
var Converter = class {
  media = [];
  /** Render a node's children as inline text. */
  inline(nodes) {
    if (!nodes) return "";
    return nodes.map((n) => this.node(n, 0, true)).join("");
  }
  listItems(node, depth, ordered) {
    const indent = "  ".repeat(depth);
    return (node.content ?? []).map((item, index) => {
      const marker = ordered ? `${index + 1}.` : "-";
      const blocks2 = (item.content ?? []).map((child) => this.node(child, depth + 1, false).trim());
      const [head = "", ...rest] = blocks2;
      const tail = rest.filter(Boolean).map(
        (b) => b.split("\n").map((line) => `${indent}  ${line}`).join("\n")
      );
      return [`${indent}${marker} ${head}`, ...tail].join("\n");
    }).join("\n");
  }
  node(node, depth = 0, inline = false) {
    switch (node.type) {
      case "doc":
        return (node.content ?? []).map((n) => this.node(n, depth)).filter(Boolean).join("\n\n");
      case "text":
        return applyMarks(node.text ?? "", node.marks);
      case "hardBreak":
        return "\n";
      case "paragraph":
        return this.inline(node.content);
      case "heading": {
        const level = Number(node.attrs?.["level"] ?? 3);
        return `${"#".repeat(Math.min(Math.max(level, 1), 6))} ${this.inline(node.content)}`;
      }
      case "bulletList":
        return this.listItems(node, depth, false);
      case "orderedList":
        return this.listItems(node, depth, true);
      case "listItem":
        return (node.content ?? []).map((n) => this.node(n, depth)).join("\n");
      case "taskList":
        return (node.content ?? []).map((n) => this.node(n, depth)).join("\n");
      case "taskItem": {
        const done = node.attrs?.["state"] === "DONE";
        return `${"  ".repeat(depth)}- [${done ? "x" : " "}] ${this.inline(node.content)}`;
      }
      case "codeBlock": {
        const language = typeof node.attrs?.["language"] === "string" ? node.attrs["language"] : "";
        const code = (node.content ?? []).map((n) => n.text ?? "").join("");
        return `\`\`\`${language}
${code}
\`\`\``;
      }
      case "blockquote":
        return (node.content ?? []).map((n) => this.node(n, depth)).join("\n\n").split("\n").map((line) => `> ${line}`).join("\n");
      case "rule":
        return "---";
      case "table": {
        const rows = (node.content ?? []).map(
          (row) => (row.content ?? []).map(
            (cell) => (cell.content ?? []).map((n) => this.node(n, depth)).join(" ").replace(/\|/g, "\\|").trim()
          )
        );
        if (rows.length === 0) return "";
        const [header2 = [], ...body] = rows;
        return [
          `| ${header2.join(" | ")} |`,
          `| ${header2.map(() => "---").join(" | ")} |`,
          ...body.map((r) => `| ${r.join(" | ")} |`)
        ].join("\n");
      }
      case "panel": {
        const kind = String(node.attrs?.["panelType"] ?? "info").toUpperCase();
        const inner = (node.content ?? []).map((n) => this.node(n, depth)).join("\n\n");
        return `> **${kind}**
${inner.split("\n").map((l) => `> ${l}`).join("\n")}`;
      }
      case "media": {
        const id = String(node.attrs?.["id"] ?? "");
        const alt = String(node.attrs?.["alt"] ?? node.attrs?.["title"] ?? "attachment");
        if (id) this.media.push({ id, alt });
        return `![${alt}](attachment:${id})`;
      }
      case "mediaSingle":
      case "mediaGroup":
        return (node.content ?? []).map((n) => this.node(n, depth)).join("\n");
      case "inlineCard":
      case "blockCard": {
        const url = node.attrs?.["url"];
        return typeof url === "string" ? `<${url}>` : "";
      }
      case "mention":
        return `@${node.attrs?.["text"] ?? node.attrs?.["id"] ?? "someone"}`;
      case "emoji":
        return String(node.attrs?.["text"] ?? node.attrs?.["shortName"] ?? "");
      case "status":
        return `\`${node.attrs?.["text"] ?? ""}\``;
      case "date": {
        const ts = Number(node.attrs?.["timestamp"]);
        return Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 10) : "";
      }
      default:
        return node.content ? (node.content ?? []).map((n) => this.node(n, depth, inline)).join(inline ? "" : "\n") : "";
    }
  }
};
function adfToMarkdown(doc) {
  if (!doc || typeof doc !== "object") return { markdown: "", media: [] };
  const converter = new Converter();
  const markdown = converter.node(doc).replace(/\n{3,}/g, "\n\n").trim();
  return { markdown, media: converter.media };
}
function markdownToAdf(text) {
  const content = blocks(text.replace(/\r\n/g, "\n").split("\n"));
  return { type: "doc", version: 1, content: content.length ? content : [{ type: "paragraph" }] };
}
function blocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const fence = /^\s*```(\S*)\s*$/.exec(line);
    if (fence) {
      const language = fence[1] ?? "";
      const body = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push({
        type: "codeBlock",
        ...language ? { attrs: { language } } : {},
        content: [{ type: "text", text: dedent(body).join("\n") }]
      });
      continue;
    }
    const heading2 = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading2) {
      out.push({
        type: "heading",
        attrs: { level: heading2[1].length },
        content: inlineNodes(heading2[2])
      });
      i += 1;
      continue;
    }
    if (isBullet(line)) {
      const items = [];
      while (i < lines.length && isBullet(lines[i])) {
        const own = [stripBullet(lines[i])];
        i += 1;
        while (i < lines.length && isContinuation(lines[i]) && !isBullet(lines[i])) {
          own.push(lines[i]);
          i += 1;
        }
        items.push({ type: "listItem", content: blocks(dedentAfterFirst(own)) });
      }
      out.push({ type: "bulletList", content: items });
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !isBullet(lines[i]) && !/^\s*```/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    if (para.length) out.push({ type: "paragraph", content: inlineNodes(para.join("\n")) });
  }
  return out;
}
function dedentAfterFirst(lines) {
  const [first = "", ...rest] = lines;
  return [first, ...dedent(rest)];
}
var isBullet = (line) => /^\s*[-*+]\s+/.test(line);
var isContinuation = (line) => /^\s+\S/.test(line);
var stripBullet = (line) => line.replace(/^\s*[-*+]\s+/, "");
function dedent(lines) {
  const widths = lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length);
  const shared = widths.length ? Math.min(...widths) : 0;
  return lines.map((l) => l.slice(shared));
}
function inlineNodes(text) {
  const out = [];
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (index > 0) out.push({ type: "hardBreak" });
    out.push(...markedText(line));
  });
  return out;
}
var INLINE = /(`[^`]+`|\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/;
function markedText(line) {
  const out = [];
  for (const piece of line.split(INLINE)) {
    if (!piece) continue;
    if (piece.startsWith("`") && piece.endsWith("`") && piece.length > 2) {
      out.push({ type: "text", text: piece.slice(1, -1), marks: [{ type: "code" }] });
    } else if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
      out.push({ type: "text", text: piece.slice(2, -2), marks: [{ type: "strong" }] });
    } else if (piece.startsWith("_") && piece.endsWith("_") && piece.length > 2) {
      out.push({ type: "text", text: piece.slice(1, -1), marks: [{ type: "em" }] });
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(piece);
      if (link) {
        out.push({
          type: "text",
          text: link[1],
          marks: [{ type: "link", attrs: { href: link[2] } }]
        });
      } else {
        out.push({ type: "text", text: piece });
      }
    }
  }
  return out.length ? out : [{ type: "text", text: "" }];
}

// packages/tracker-jira/src/index.ts
var JiraError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
  status;
  name = "JiraError";
};
function redactJira(text) {
  return text.replace(/ATATT[A-Za-z0-9_\-=]{10,}/g, "[REDACTED]").replace(/(["']?(?:token|password|secret|api[_-]?key)["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, "$1[REDACTED]");
}
var HttpJira = class {
  constructor(opts) {
    this.opts = opts;
    this.auth = Buffer.from(`${opts.email}:${opts.apiToken}`).toString("base64");
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? ((ms2) => new Promise((r) => setTimeout(r, ms2)));
  }
  opts;
  auth;
  fetchImpl;
  sleep;
  async request(method, path26, body) {
    const url = `${this.opts.baseUrl.replace(/\/$/, "")}/rest/api/3/${path26}`;
    const maxAttempts = method === "GET" ? this.opts.maxAttempts ?? 3 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Basic ${this.auth}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        ...body === void 0 ? {} : { body: JSON.stringify(body) }
      });
      if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await this.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1e3 : 2 ** attempt * 500);
        continue;
      }
      if (!res.ok) {
        throw new JiraError(`HTTP ${res.status}: ${redactJira((await res.text().catch(() => "")).slice(0, 300))}`, res.status);
      }
      if (res.status === 204) return void 0;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) {
        throw new JiraError(
          `Jira returned ${contentType || "a non-JSON response"}. Check the base URL has no trailing path.`,
          res.status
        );
      }
      return await res.json();
    }
    throw new JiraError("request failed", 0);
  }
};
var DEFAULT_STATE_MAPPING = {
  todo: ["To Do", "Open", "Backlog", "New"],
  in_progress: ["In Progress", "In Development"],
  in_review: ["In Review", "Code Review", "Review"],
  done: ["Done", "Closed", "Resolved", "Complete"],
  blocked: ["Blocked", "On Hold", "Impediment"]
};
var JiraTracker = class {
  constructor(opts) {
    this.opts = opts;
    this.mapping = { ...DEFAULT_STATE_MAPPING, ...opts.stateMapping };
  }
  opts;
  id = "jira";
  mapping;
  toSpec(issue) {
    const { markdown, media } = adfToMarkdown(issue.fields.description ?? null);
    const estimate = this.opts.estimateField ? issue.fields[this.opts.estimateField] : void 0;
    return {
      id: issue.key,
      title: issue.fields.summary,
      body: markdown,
      acceptanceCriteria: extractAcceptanceCriteria(markdown).map((text) => ({ text })),
      scope: {
        allow: this.opts.defaultScope?.allow ?? [],
        deny: this.opts.defaultScope?.deny ?? [],
        ...this.opts.defaultScope?.maxFiles !== void 0 ? { maxFiles: this.opts.defaultScope.maxFiles } : {}
      },
      qualityGate: this.opts.defaultQualityGate ?? [],
      origin: {
        tracker: "jira",
        id: issue.key,
        ...this.opts.browseBaseUrl ? { url: `${this.opts.browseBaseUrl}/browse/${issue.key}` } : {}
      },
      labels: issue.fields.labels ?? [],
      ...typeof estimate === "number" ? { estimate } : {},
      ...issue.fields.attachment?.length || media.length ? {
        attachments: [
          ...(issue.fields.attachment ?? []).map((a) => ({ name: a.filename, url: a.content })),
          ...media.map((m) => ({ name: m.alt }))
        ]
      } : {}
    };
  }
  fields() {
    return [
      "summary",
      "description",
      "status",
      "issuetype",
      "priority",
      "labels",
      "attachment",
      ...this.opts.estimateField ? [this.opts.estimateField] : []
    ];
  }
  async listReady(limit = 10) {
    const data = await this.opts.transport.request("POST", "search/jql", {
      jql: this.opts.jql,
      maxResults: limit,
      fields: this.fields()
    });
    return (data.issues ?? []).map((i) => this.toSpec(i));
  }
  async get(id) {
    try {
      const issue = await this.opts.transport.request(
        "GET",
        `issue/${encodeURIComponent(id)}?fields=${this.fields().join(",")}`
      );
      return this.toSpec(issue);
    } catch (err) {
      if (err instanceof JiraError && err.status === 404) return null;
      throw err;
    }
  }
  /**
   * Move a ticket by semantic state.
   *
   * Resolves against the transitions Jira actually offers from the current status, so an
   * unreachable target fails with the available options listed rather than silently doing
   * nothing — the most common way a Jira integration appears to work but does not.
   */
  /**
   * Put the account the credentials belong to on the ticket.
   *
   * Jira Cloud assigns by account id, not email, so the id is read from `myself` — which is
   * also the honest answer to "who is doing this": whoever's token it is. Cached, because it
   * cannot change within a process.
   */
  async assignToSelf(id) {
    const accountId = await this.selfAccountId();
    if (!accountId) return;
    await this.opts.transport.request("PUT", `issue/${encodeURIComponent(id)}/assignee`, { accountId });
  }
  selfId;
  async selfAccountId() {
    if (this.selfId !== void 0) return this.selfId;
    const me = await this.opts.transport.request("GET", "myself").catch(() => null);
    this.selfId = me?.accountId ?? null;
    return this.selfId;
  }
  async transition(id, to) {
    const data = await this.opts.transport.request("GET", `issue/${encodeURIComponent(id)}/transitions`);
    const wanted = this.mapping[to] ?? [];
    const normalise = (s) => s.toLowerCase().trim();
    const match = data.transitions.find((t) => wanted.some((w) => normalise(t.to?.name ?? "") === normalise(w))) ?? data.transitions.find((t) => wanted.some((w) => normalise(t.name) === normalise(w)));
    if (!match) {
      const available = data.transitions.map((t) => t.to?.name ?? t.name).join(", ");
      throw new JiraError(
        `No transition to "${to}" from the current status of ${id}. Wanted one of: ${wanted.join(", ")}. Available: ${available || "none"}. Configure stateMapping if this project uses different status names.`,
        409
      );
    }
    await this.opts.transport.request("POST", `issue/${encodeURIComponent(id)}/transitions`, {
      transition: { id: match.id }
    });
  }
  async comment(id, body) {
    await this.opts.transport.request("POST", `issue/${encodeURIComponent(id)}/comment`, {
      body: markdownToAdf(body)
    });
  }
  async setLabels(id, add, remove) {
    if (add.length === 0 && remove.length === 0) return;
    await this.opts.transport.request("PUT", `issue/${encodeURIComponent(id)}`, {
      update: {
        labels: [...add.map((l) => ({ add: l })), ...remove.map((l) => ({ remove: l }))]
      }
    });
  }
};

// packages/cli/src/resolve.ts
var AGENT_NAMES = ["claude", "cursor", "codex", "copilot", "local"];
var ConfigError = class extends Error {
  constructor(message, hint) {
    super(message);
    this.hint = hint;
  }
  hint;
  name = "ConfigError";
};
function env(name) {
  const value = process.env[name];
  return value && value.trim() ? value : void 0;
}
function repoRef(opts) {
  const value = opts.repo ?? env("CTXMUX_REPO") ?? env("GITHUB_REPOSITORY");
  if (!value) {
    throw new ConfigError(
      "No repository configured.",
      "Pass --repo owner/name, or set CTXMUX_REPO. Inside a GitHub Action, GITHUB_REPOSITORY is used automatically."
    );
  }
  return parseRepo(value);
}
async function fromConfig(root, key) {
  try {
    const { loadConfig: loadConfig2 } = await Promise.resolve().then(() => (init_src(), src_exports));
    const config = await loadConfig2(root);
    const value = config[key];
    return value && value.trim() ? value : void 0;
  } catch {
    return void 0;
  }
}
async function resolveAgent(opts) {
  const name = (opts.agent ?? env("CTXMUX_AGENT") ?? await fromConfig(opts.root, "agent") ?? "claude").toLowerCase();
  switch (name) {
    case "claude":
      return claudeAgent({
        ...opts.model ? { model: opts.model } : {},
        isolated: opts.isolate,
        ...opts.trajectory ? { trajectory: opts.trajectory } : {},
        ...opts.recovery ? { recovery: opts.recovery } : {}
      });
    case "cursor":
      return cursorAgent({
        ...opts.model ? { model: opts.model } : {},
        isolated: opts.isolate,
        ...opts.trajectory ? { trajectory: opts.trajectory } : {},
        ...opts.recovery ? { recovery: opts.recovery } : {}
      });
    case "codex":
      return codexAgent({
        ...opts.model ? { model: opts.model } : {},
        isolated: opts.isolate,
        ...opts.trajectory ? { trajectory: opts.trajectory } : {},
        ...opts.recovery ? { recovery: opts.recovery } : {}
      });
    case "local":
      return localAgent({
        ...env("CTXMUX_LOCAL_HARNESS") ? { harness: env("CTXMUX_LOCAL_HARNESS") } : {},
        ...opts.model ? { model: opts.model } : {},
        isolated: opts.isolate,
        ...opts.trajectory ? { trajectory: opts.trajectory } : {},
        ...opts.recovery ? { recovery: opts.recovery } : {}
      });
    case "copilot": {
      let client;
      try {
        ;
        ({ client } = await resolveClient());
      } catch (err) {
        throw new ConfigError(
          err.message,
          "Run `gh auth login`, or set GITHUB_TOKEN."
        );
      }
      return copilotAgent({ client, repo: repoRef(opts) });
    }
    default:
      throw new ConfigError(
        `Unknown agent "${name}".`,
        `Valid agents are: ${AGENT_NAMES.join(", ")}.`
      );
  }
}
async function resolveTracker(opts) {
  const name = (opts.tracker ?? env("CTXMUX_TRACKER") ?? await fromConfig(opts.root, "tracker") ?? "file").toLowerCase();
  switch (name) {
    case "file":
      return new FileTracker({ root: opts.root, defaultQualityGate: opts.defaultQualityGate });
    case "github": {
      const { client } = await resolveClient();
      return new GitHubTracker({
        client,
        repo: repoRef(opts),
        label: env("CTXMUX_LABEL") ?? "contextmux",
        defaultQualityGate: opts.defaultQualityGate,
        ...opts.scope ? { defaultScope: opts.scope } : {}
      });
    }
    case "jira": {
      const baseUrl = env("JIRA_URL");
      const email = env("JIRA_EMAIL");
      const apiToken = env("JIRA_API_TOKEN");
      if (!baseUrl || !email || !apiToken) {
        const missing = [
          !baseUrl && "JIRA_URL",
          !email && "JIRA_EMAIL",
          !apiToken && "JIRA_API_TOKEN"
        ].filter(Boolean);
        throw new ConfigError(
          `Jira is not configured: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set.`,
          "Create an API token at id.atlassian.com and set all three."
        );
      }
      return new JiraTracker({
        transport: new HttpJira({ baseUrl, email, apiToken }),
        jql: env("CTXMUX_JQL") ?? `labels = "contextmux" AND statusCategory != Done ORDER BY created ASC`,
        ...env("JIRA_ESTIMATE_FIELD") ? { estimateField: env("JIRA_ESTIMATE_FIELD") } : {},
        defaultQualityGate: opts.defaultQualityGate,
        browseBaseUrl: baseUrl,
        ...opts.scope ? { defaultScope: opts.scope } : {}
      });
    }
    default:
      throw new ConfigError(`Unknown tracker "${name}".`, "Valid trackers are: file, github, jira.");
  }
}
async function resolvePublishTarget(opts, root) {
  const ref = repoRef(opts);
  const { client } = await resolveClient({});
  const forge = new GitHubForge(client, ref);
  const fromEnv = env("GITHUB_REF_NAME") ?? env("CTXMUX_BASE_BRANCH");
  if (fromEnv) return { forge, baseBranch: fromEnv };
  const { execFile: execFile2 } = await import("node:child_process");
  const { promisify: promisify2 } = await import("node:util");
  const exec2 = promisify2(execFile2);
  const current = await exec2("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root }).then((r) => r.stdout.trim()).catch(() => "");
  if (!current || current === "HEAD") {
    throw new ConfigError(
      "Could not work out which branch to open the pull request against.",
      "Set CTXMUX_BASE_BRANCH, or run from a checkout that is on a branch."
    );
  }
  return { forge, baseBranch: current };
}

// packages/cli/src/commands/run.ts
init_src();

// packages/handoff/src/package.ts
function extractDeadEnds(trajectory) {
  const ends = /* @__PURE__ */ new Map();
  for (const step of trajectory.of("tool")) {
    const data = step.data;
    if (!data?.signature) continue;
    if (data.ok === false) {
      const key = `fail:${data.signature}`;
      const existing = ends.get(key);
      if (existing) existing.attempts += 1;
      else {
        ends.set(key, {
          approach: `${step.name}: ${step.summary}`,
          outcome: data.error ?? "failed",
          attempts: 1
        });
      }
    }
  }
  const bySignature = /* @__PURE__ */ new Map();
  for (const step of trajectory.of("tool")) {
    const data = step.data;
    if (!data?.signature || data.ok === false) continue;
    const entry = bySignature.get(data.signature) ?? { name: step.name, summary: step.summary, count: 0 };
    entry.count += 1;
    bySignature.set(data.signature, entry);
  }
  for (const [signature, entry] of bySignature) {
    if (entry.count < 3) continue;
    ends.set(`repeat:${signature}`, {
      approach: `${entry.name}: ${entry.summary}`,
      outcome: "tried repeatedly without getting anywhere",
      attempts: entry.count
    });
  }
  return [...ends.values()].sort((a, b) => b.attempts - a.attempts);
}
function summariseDiff(diff) {
  if (!diff.trim()) return "no changes yet";
  const perFile = /* @__PURE__ */ new Map();
  let current = null;
  let removedFile = null;
  for (const line of diff.split("\n")) {
    const from = /^--- (?:a\/(.+)|\/dev\/null)$/.exec(line);
    if (from) {
      removedFile = from[1]?.trim() ?? null;
      continue;
    }
    const to = /^\+\+\+ (?:b\/(.+)|\/dev\/null)$/.exec(line);
    if (to) {
      current = to[1]?.trim() ?? removedFile;
      if (current && !perFile.has(current)) perFile.set(current, { added: 0, removed: 0 });
      continue;
    }
    if (!current) continue;
    const stats = perFile.get(current);
    if (line.startsWith("+") && !line.startsWith("+++")) stats.added += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) stats.removed += 1;
  }
  if (perFile.size === 0) return "changes present but not attributable to files";
  return [...perFile].map(([file, s]) => `${file} (+${s.added}/-${s.removed})`).join(", ");
}
function extractSuggestion(trajectory) {
  const last = trajectory.of("message").at(-1)?.summary?.trim();
  if (!last || last.length < 20) return void 0;
  return last;
}
function extractObservations(trajectory) {
  const out = [];
  for (const step of trajectory.of("message")) {
    const text = step.summary;
    if (/\b(?:turns out|actually|note that|the codebase|existing|already has|there is no)\b/i.test(text)) {
      out.push(text);
    }
  }
  return out.slice(0, 5);
}
function buildHandoff(opts) {
  const { trajectory, result } = opts;
  return {
    version: 1,
    reason: opts.reason,
    from: { agentId: opts.fromAgentId, runId: opts.runId, round: opts.round },
    task: opts.task,
    workspace: {
      ...result?.location?.branch ? { branch: result.location.branch } : {},
      ...result?.location?.worktree ? { worktree: result.location.worktree } : {},
      filesChanged: result?.filesChanged ?? []
    },
    deadEnds: extractDeadEnds(trajectory),
    progress: {
      summary: result?.summary?.split("\n").slice(0, 5).join("\n") ?? "nothing reported",
      diffSummary: summariseDiff(result?.diff ?? "")
    },
    failedChecks: (opts.gateOutcomes ?? []).filter((o) => o.verdict !== "pass").map((o) => ({ gate: o.gate, reason: o.reason ?? "failed" })),
    filesExamined: [...new Set(trajectory.readFiles())].slice(0, 30),
    ...extractSuggestion(trajectory) ? { suggestion: extractSuggestion(trajectory) } : {},
    observations: extractObservations(trajectory)
  };
}

// packages/handoff/src/render.ts
var INCLUDES = {
  none: [],
  essential: ["essential"],
  valuable: ["essential", "valuable"],
  optional: ["essential", "valuable", "optional"]
};
var HandoffTooLargeError = class extends Error {
  name = "HandoffTooLargeError";
  /** The rendering that did not fit, already reduced as far as it can be. */
  text;
  chars;
  maxChars;
  constructor(text, maxChars) {
    super(
      `Handoff is ${text.length} characters with nothing left to drop, over the ${maxChars} allowed. Raise maxChars to at least ${text.length}, or hand over at a lower tier.`
    );
    this.text = text;
    this.chars = text.length;
    this.maxChars = maxChars;
  }
};
function estimateTokens2(text) {
  return Math.ceil(text.length / 3.6);
}
function sections(pkg) {
  const out = [];
  out.push({
    tier: "essential",
    text: [
      `# Continuing work started by another agent`,
      "",
      `${pkg.from.agentId} stopped on this task. Reason: ${pkg.reason}`,
      "",
      `## Task: ${pkg.task.title}`,
      "",
      pkg.task.body,
      ...pkg.task.acceptanceCriteria.length ? ["", "### Acceptance criteria", "", ...pkg.task.acceptanceCriteria.map((c2) => `- ${c2.text}`)] : []
    ].join("\n")
  });
  const ws = pkg.workspace;
  out.push({
    tier: "essential",
    text: [
      "## Where the work is",
      "",
      ws.filesChanged.length ? `Partial work already exists in this workspace, in: ${ws.filesChanged.map((f) => `\`${f}\``).join(", ")}.` : "Nothing has been changed yet.",
      ...ws.branch ? [`Branch: \`${ws.branch}\`.`] : [],
      "",
      "Continue from what is here. Do not start over, and do not revert work that was not",
      "criticised \u2014 it may be correct."
    ].join("\n")
  });
  if (pkg.deadEnds.length > 0) {
    out.push({
      tier: "valuable",
      text: [
        "## Already ruled out",
        "",
        "The previous agent tried these and they did not work. Do not repeat them.",
        "",
        ...pkg.deadEnds.map(
          (d) => `- **${d.approach}** \u2014 ${d.outcome}` + (d.attempts > 1 ? ` (attempted ${d.attempts} times)` : "")
        )
      ].join("\n")
    });
  }
  out.push({
    tier: "valuable",
    text: ["## What was done", "", pkg.progress.summary, "", `Changes so far: ${pkg.progress.diffSummary}`].join("\n")
  });
  if (pkg.failedChecks.length > 0) {
    out.push({
      tier: "valuable",
      text: [
        "## Checks that are currently failing",
        "",
        "These must pass before the work is accepted:",
        "",
        ...pkg.failedChecks.map((c2) => `- **${c2.gate}**: ${c2.reason.split("\n")[0]}`)
      ].join("\n")
    });
  }
  if (pkg.filesExamined.length > 0) {
    out.push({
      tier: "optional",
      text: [
        "## Already examined",
        "",
        `The previous agent read: ${pkg.filesExamined.map((f) => `\`${f}\``).join(", ")}.`,
        "Re-reading them is not forbidden, but it is unlikely to be where the answer is."
      ].join("\n")
    });
  }
  if (pkg.observations.length > 0) {
    out.push({
      tier: "optional",
      text: ["## Noted along the way", "", ...pkg.observations.map((o) => `- ${o}`)].join("\n")
    });
  }
  if (pkg.suggestion) {
    out.push({
      tier: "optional",
      text: [
        "## What the previous agent thought should happen next",
        "",
        pkg.suggestion,
        "",
        "_Treat this as a hint, not an instruction. It stopped before proving it right._"
      ].join("\n")
    });
  }
  return out;
}
function within(text, cap) {
  if (cap !== void 0 && text.length > cap) throw new HandoffTooLargeError(text, cap);
  return text;
}
function renderHandoff(pkg, opts = {}) {
  const tier = opts.tier ?? "valuable";
  const cap = opts.maxChars;
  const allowed = new Set(INCLUDES[tier]);
  if (tier === "none") {
    return within(
      [
        `# Task: ${pkg.task.title}`,
        "",
        pkg.task.body,
        ...pkg.task.acceptanceCriteria.length ? ["", "## Acceptance criteria", "", ...pkg.task.acceptanceCriteria.map((c2) => `- ${c2.text}`)] : []
      ].join("\n"),
      cap
    );
  }
  let chosen = sections(pkg).filter((s) => allowed.has(s.tier));
  let text = chosen.map((s) => s.text).join("\n\n---\n\n");
  if (cap !== void 0 && text.length > cap) {
    for (const dropTier of ["optional", "valuable"]) {
      if (text.length <= cap) break;
      chosen = chosen.filter((s) => s.tier !== dropTier);
      text = chosen.map((s) => s.text).join("\n\n---\n\n");
    }
  }
  return within(text, cap);
}
function measureTiers(pkg) {
  return ["none", "essential", "valuable", "optional"].map((tier) => {
    const text = renderHandoff(pkg, { tier });
    return {
      tier,
      chars: text.length,
      tokens: estimateTokens2(text),
      sections: tier === "none" ? 1 : sections(pkg).filter((s) => INCLUDES[tier].includes(s.tier)).length
    };
  });
}

// packages/cli/src/publish.ts
var PublishError = class extends Error {
  constructor(message, hint) {
    super(message);
    this.hint = hint;
    this.name = "PublishError";
  }
  hint;
};
var AGENT_IDENTITY = ["-c", "user.name=contextmux", "-c", "user.email=contextmux@users.noreply.github.com"];
async function git3(runner, args) {
  const res = await runner.exec("git", args, { timeoutMs: 12e4 });
  return { code: res.code, stdout: res.stdout, stderr: res.stderr };
}
async function commitIfDirty(runner, run3, agentId) {
  const status = await git3(runner, ["status", "--porcelain"]);
  if (status.code !== 0) {
    throw new PublishError(`could not read the worktree state: ${status.stderr.trim()}`);
  }
  if (!status.stdout.trim()) return false;
  const add = await git3(runner, ["add", "-A"]);
  if (add.code !== 0) throw new PublishError(`could not stage the changes: ${add.stderr.trim()}`);
  const configured = await git3(runner, ["config", "user.email"]);
  const identity = configured.code === 0 && configured.stdout.trim() ? [] : AGENT_IDENTITY;
  const message = `${run3.task.id} ${run3.task.title}

Produced by ${agentId} under contextmux gates.`;
  const commit = await git3(runner, [...identity, "commit", "-m", message]);
  if (commit.code !== 0) throw new PublishError(`could not commit the changes: ${commit.stderr.trim()}`);
  return true;
}
function pullRequestBody(run3, baseBranch, agentId) {
  const lines = [];
  const origin = run3.task.origin;
  lines.push(run3.task.body.trim() || "_No description on the task._", "");
  lines.push("---", "");
  lines.push(`Produced by \`${agentId}\` for **${run3.task.id}**`);
  if (origin?.url) lines.push(`Task: ${origin.url}`);
  lines.push(`Base: \`${baseBranch}\``, "");
  const gates = run3.gateOutcomes ?? [];
  if (gates.length > 0) {
    lines.push("### Gates", "");
    for (const gate of gates) {
      const mark = gate.verdict === "pass" ? "\u2705" : gate.verdict === "reject" ? "\u274C" : "\u26A0\uFE0F";
      lines.push(`- ${mark} \`${gate.gate}\`${gate.reason ? ` \u2014 ${gate.reason.split("\n")[0]}` : ""}`);
    }
    lines.push("");
  }
  const files = run3.result?.filesChanged ?? [];
  if (files.length > 0) {
    lines.push(`### Files changed (${files.length})`, "");
    for (const file of files.slice(0, 25)) lines.push(`- \`${file}\``);
    if (files.length > 25) lines.push(`- _\u2026and ${files.length - 25} more_`);
    lines.push("");
  }
  lines.push(
    "> An agent wrote this. The gates above checked the diff it produced, not the reasoning",
    "> behind it \u2014 review it as you would any other change."
  );
  return lines.join("\n");
}
async function publishRun(input) {
  const { run: run3, runner, forge, baseBranch, branch, agentId } = input;
  if (!branch) {
    throw new PublishError(
      "this run has no branch of its own to publish.",
      "Publishing pushes a branch to the remote, so the run has to be isolated. Drop --no-isolate."
    );
  }
  if (branch === baseBranch) {
    throw new PublishError(
      `the run is on \`${baseBranch}\`, which is the branch it would target.`,
      "Publishing needs somewhere to open the pull request from."
    );
  }
  await commitIfDirty(runner, run3, agentId);
  const ahead = await git3(runner, ["rev-list", "--count", `${baseBranch}..HEAD`]);
  if (ahead.code === 0 && ahead.stdout.trim() === "0") {
    throw new PublishError(
      "there is nothing on this branch that is not already on the base.",
      "The agent reported changes, but none of them survived to a commit."
    );
  }
  const push = await git3(runner, ["push", "--force-with-lease", "-u", "origin", `${branch}:${branch}`]);
  if (push.code !== 0) {
    throw new PublishError(
      `could not push \`${branch}\`: ${push.stderr.trim().split("\n").slice(-3).join(" ")}`,
      "The token needs `contents: write` on this repository."
    );
  }
  const title = `${run3.task.id} ${run3.task.title}`;
  const body = pullRequestBody(run3, baseBranch, agentId);
  let pr;
  try {
    pr = await forge.createPullRequest({
      title,
      head: branch,
      base: baseBranch,
      body,
      ...input.draft !== void 0 ? { draft: input.draft } : {}
    });
    return { url: pr.url, number: pr.number, created: true };
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 422) {
      const existing = await forge.findPullRequestByBranch(branch).catch(() => null);
      if (existing) return { url: existing.url, number: existing.number, created: false };
    }
    throw new PublishError(
      `pushed \`${branch}\`, but could not open a pull request: ${err.message}`,
      "The branch is on the remote, so the work is not lost \u2014 open the pull request by hand."
    );
  }
}

// packages/cli/src/commands/run.ts
async function writeTrace(root, runId, trajectory, dryRun) {
  if (trajectory.length === 0 || dryRun) return;
  const traceDir = path17.join(root, ".ctxmux", "state", "traces");
  await writeFileAtomic(
    path17.join(traceDir, `${encodeURIComponent(runId)}.json`),
    JSON.stringify(trajectory.toJSON(), null, 2)
  );
}
function gatesFor(task, opts = {}) {
  const typedByHand = task.origin.tracker === "inline";
  const gates = [
    readiness(typedByHand ? { minBodyChars: 12, requireAcceptanceCriteria: false } : {}),
    complexity(),
    producedChanges(),
    pathScope({ defaultDeny: DEFAULT_DENY }),
    testIntegrity(),
    qualityGate()
  ];
  if (opts.minimal) {
    gates.push(noUnrequestedDependencies(), noSpeculativeAbstraction());
    if (opts.index) {
      const index = opts.index;
      gates.push(
        noDuplicateSymbols({
          existing: () => index.files.flatMap(
            (f) => f.symbols.filter((sym) => sym.exported).map((sym) => ({ name: sym.name, file: f.path }))
          )
        })
      );
    }
  }
  return gates;
}
function parseScope(raw) {
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
}
function attachReporter(engine, verbose) {
  engine.on((e) => {
    switch (e.type) {
      case "run:state":
        info(`  ${c.dim("->")} ${c.bold(e.to)} ${c.dim(`(${e.via})`)}`);
        break;
      case "gate:result": {
        const o = e.outcome;
        if (o.verdict === "pass") {
          if (verbose) bullet(`${c.green("pass")} ${o.gate}`);
        } else {
          const tag = o.verdict === "escalate" ? c.red("escalate") : c.yellow("reject");
          bullet(`${tag} ${o.gate}: ${o.reason ?? ""}`);
          if (o.hint) info(`      ${c.dim(o.hint)}`);
        }
        break;
      }
      case "agent:dispatched":
        info(
          `  ${c.cyan("agent")} ${e.agentId}${e.round > 0 ? c.dim(` (revision round ${e.round})`) : ""} working...`
        );
        break;
      case "agent:finished":
        info(`  ${c.cyan("agent")} ${e.status}, ${e.filesChanged} file(s) changed`);
        break;
      case "agent:progress":
        info(`  ${c.cyan("agent")} ${e.message}`);
        break;
      case "log":
        if (e.level === "warn") warn(e.message);
        else if (verbose) info(c.dim(`  ${e.message}`));
        break;
    }
  });
}
function summarise(run3, worktree, exitCode) {
  return {
    runId: run3.id,
    taskId: run3.task.id,
    state: run3.state,
    ok: run3.state === "in_review" || run3.state === "completed",
    exitCode,
    filesChanged: run3.result?.filesChanged.length ?? 0,
    rounds: run3.feedbackRound,
    attempts: run3.attempt,
    reason: run3.terminalReason ?? null,
    worktree,
    pullRequest: run3.result?.location?.prUrl ?? null,
    costUsd: run3.result?.usage?.costUsd ?? null,
    gates: run3.gateOutcomes.map((o) => ({
      gate: o.gate,
      verdict: o.verdict,
      ...o.reason ? { reason: o.reason } : {}
    }))
  };
}
function exitCodeFor(run3, dryRun) {
  if (dryRun) return run3.state === "rejected" ? 3 : 0;
  switch (run3.state) {
    case "in_review":
    case "completed":
      return 0;
    case "rejected":
      return 3;
    case "escalated":
      return 4;
    default:
      return 1;
  }
}
function reportOutcome(run3, worktree, dryRun) {
  if (dryRun) {
    info("");
    if (run3.state === "ready") {
      success("Dry run: gates passed and the prompt was assembled. Nothing was dispatched.");
      info(c.dim("  Re-run without --dry-run to execute, or add --verbose to see the prompt."));
      return 0;
    }
    warn(`Dry run stopped at "${run3.state}".`);
    for (const o of run3.gateOutcomes.filter((g) => g.verdict !== "pass")) {
      bullet(`${o.gate}: ${o.reason ?? ""}`);
    }
    return run3.state === "rejected" ? 3 : 0;
  }
  info("");
  switch (run3.state) {
    case "in_review":
      success(`Changes proposed for ${run3.task.id}.`);
      break;
    case "completed":
      success(`${run3.task.id} completed.`);
      break;
    case "rejected":
      warn(`${run3.task.id} was not picked up.`);
      info("");
      for (const o of run3.gateOutcomes.filter((g) => g.verdict !== "pass")) {
        bullet(`${o.gate}: ${o.reason ?? ""}`);
        if (o.hint) info(`      ${c.dim(o.hint)}`);
      }
      return 3;
    case "escalated":
      error(`${run3.task.id} needs a human: ${run3.terminalReason ?? "unknown reason"}`);
      return 4;
    case "failed":
      error(`${run3.task.id} failed: ${run3.terminalReason ?? "unknown reason"}`);
      return 1;
    default:
      warn(`${run3.task.id} ended in state "${run3.state}".`);
      return 1;
  }
  const result = run3.result;
  if (result) {
    info("");
    heading("Summary");
    info(result.summary.split("\n").slice(0, 20).join("\n"));
    if (result.filesChanged.length > 0) {
      heading(`Files changed (${result.filesChanged.length})`);
      for (const f of result.filesChanged.slice(0, 25)) bullet(f);
      if (result.filesChanged.length > 25) {
        info(c.dim(`  ... and ${result.filesChanged.length - 25} more`));
      }
    }
    const u = result.usage;
    if (u && (u.costUsd !== void 0 || u.turns !== void 0)) {
      heading("Cost");
      bullet(
        [
          u.turns !== void 0 ? `${u.turns} turn(s)` : null,
          u.outputTokens !== void 0 ? `${u.outputTokens} output tokens` : null,
          u.costUsd !== void 0 ? `$${u.costUsd.toFixed(4)}` : null
        ].filter(Boolean).join(", ")
      );
    } else if (result.location?.prUrl) {
      heading("Cost");
      bullet(c.dim("billed by the agent provider, which reports no per-task figure here"));
      bullet(c.dim("GitHub: Settings \u2192 Billing \u2192 Copilot, for premium request usage"));
    }
  }
  if (worktree) {
    heading("Review the change");
    bullet(`cd ${worktree} && git diff`);
    info(c.dim("  The work is in an isolated worktree; your working tree was not touched."));
  }
  return 0;
}
async function runCommand(args) {
  const root = path17.resolve(flagString(args, "root") ?? process.cwd());
  const target = args.positionals.join(" ").trim();
  const dryRun = flagBool(args, "dry-run", "n");
  const asJson = flagBool(args, "json");
  const verbose = flagBool(args, "verbose", "v");
  const noIsolate = flagBool(args, "no-isolate");
  const noGates = flagBool(args, "no-gates");
  const noRecovery = flagBool(args, "no-recovery");
  const openPr = flagBool(args, "open-pr");
  const chain = (flagString(args, "agents") ?? "").split(",").map((a) => a.trim()).filter(Boolean);
  const handoffTier = flagString(args, "handoff-tier") ?? "valuable";
  if (!target) {
    warn("Nothing to run.");
    info("");
    info("  ctxmux run T-1                      " + c.dim("a task from .ctxmux/tasks/"));
    info('  ctxmux run "add a date helper"      ' + c.dim("an ad-hoc task"));
    info("  ctxmux run T-1 --dry-run            " + c.dim("show the plan without spending anything"));
    return 1;
  }
  const profile = await detectProfile(root);
  const allowScope = parseScope(flagString(args, "allow"));
  const denyScope = parseScope(flagString(args, "deny"));
  const trajectory = new Trajectory({
    // Provisional: the task has not been resolved yet, so this is corrected below once the run
    // it belongs to has an id. A trajectory naming a run that does not exist is a recording
    // nothing can look up.
    runId: `run-${target}`,
    taskId: target,
    agentId: "pending",
    round: 0,
    startedAt: Date.now()
  });
  const resolveOptions = {
    root,
    trajectory,
    ...noRecovery ? {} : {
      recovery: {
        sampleIntervalMs: flagNumber(args, "sample-interval", {
          default: 3e4,
          min: 1e3
        }),
        stallAfterSamples: flagNumber(args, "stall-after", {
          default: 3,
          min: 1
        })
      }
    },
    // `--agents a,b` names the chain; its first entry is also the agent that starts.
    ...chain[0] ? { agent: chain[0] } : flagString(args, "agent") ? { agent: flagString(args, "agent") } : {},
    ...flagString(args, "tracker") ? { tracker: flagString(args, "tracker") } : {},
    ...flagString(args, "repo") ? { repo: flagString(args, "repo") } : {},
    ...flagString(args, "model") ? { model: flagString(args, "model") } : {},
    isolate: !noIsolate,
    defaultQualityGate: profile.qualityGate,
    ...allowScope.length || denyScope.length ? { scope: { allow: allowScope, deny: denyScope } } : {}
  };
  let tracker;
  let agent;
  try {
    tracker = await resolveTracker(resolveOptions);
    agent = await resolveAgent(resolveOptions);
  } catch (err) {
    if (err instanceof ConfigError) {
      error(err.message);
      if (err.hint) info("    " + c.dim(err.hint));
      return 1;
    }
    throw err;
  }
  let task;
  try {
    task = await tracker.get(target);
  } catch (err) {
    error(`Could not read "${target}" from the ${tracker.id} tracker: ${err.message}`);
    if (tracker.id === "jira") {
      info("    " + c.dim("Check JIRA_URL, JIRA_EMAIL and JIRA_API_TOKEN, and that the ticket exists."));
    }
    return 1;
  }
  if (!task) {
    if (tracker.id !== "file") {
      error(`${tracker.id} has no task "${target}".`);
      info("    " + c.dim("Check the id, and that the account you are authenticated as can see it."));
      return 1;
    }
    task = inlineTask(target, { qualityGate: profile.qualityGate });
    info(c.dim(`No task file matched "${target}"; treating it as an ad-hoc task.`));
  }
  const maxFiles = args.flags.has("max-files") ? flagNumber(args, "max-files", { default: 0, min: 1 }) : void 0;
  if (allowScope.length || denyScope.length || maxFiles !== void 0) {
    task = {
      ...task,
      scope: {
        allow: allowScope.length ? allowScope : task.scope.allow,
        deny: denyScope.length ? denyScope : task.scope.deny,
        ...maxFiles !== void 0 ? { maxFiles } : task.scope.maxFiles !== void 0 ? { maxFiles: task.scope.maxFiles } : {}
      }
    };
  }
  trajectory.meta.runId = `run-${task.id}`;
  trajectory.meta.taskId = task.id;
  trajectory.attribute(agent.id);
  const health = await agent.preflight();
  if (!health.ok && !dryRun) {
    error(health.detail);
    return 1;
  }
  const verifyWorktrees = [];
  const wantsIsolation = !noIsolate && agent.capabilities.sandbox === "caller";
  const { runner, isolated, note } = await LocalRunner.create({
    root,
    isolate: wantsIsolation,
    branch: `ctxmux/${task.id.toLowerCase()}`
  });
  let disposed = false;
  const reclaim = async () => {
    if (disposed) return;
    disposed = true;
    await runner.dispose().catch(() => {
    });
  };
  try {
    if (note && wantsIsolation && !isolated) {
      warn(note);
      info("");
      error("Refusing to run an agent in your working tree unless you say so.");
      info("    " + c.dim("Commit what you have, then re-run \u2014 an isolated worktree needs a commit to branch from."));
      info("    " + c.dim("Or pass --no-isolate to let the agent edit your checkout directly."));
      return 1;
    }
    if (note) warn(note);
    trajectory.attribute(agent.id, runner.cwd);
    const context = await loadContext({ root }).then(
      (ctx) => ctx.model,
      () => void 0
    );
    const index = await buildIndex(root).catch(() => void 0);
    const gates = noGates ? [] : gatesFor(task, { minimal: flagBool(args, "minimal"), ...index ? { index } : {} });
    if (!asJson) {
      heading(`Task ${task.id}`);
      bullet(task.title);
      if (task.acceptanceCriteria.length) {
        bullet(`${task.acceptanceCriteria.length} acceptance criterion/criteria`);
      }
      bullet(`tracker: ${tracker.id}`);
      bullet(`agent: ${agent.displayName} (${agent.kind})${health.ok ? "" : c.yellow(" \u2014 unavailable")}`);
      bullet(
        agent.capabilities.sandbox === "vendor" ? `sandbox: provided by ${agent.displayName}` : isolated ? `isolated worktree: ${runner.cwd}` : c.yellow("running in your working tree")
      );
      bullet(`gates: ${gates.length ? gates.map((g) => g.name).join(", ") : c.yellow("none")}`);
      bullet(
        noRecovery ? c.yellow("recovery: off") : agent.capabilities.sandbox === "vendor" ? c.dim("recovery: unavailable \u2014 the agent runs where we cannot watch it") : `recovery: stop after ${flagString(args, "stall-after") ?? "3"} samples with no progress`
      );
      if (task.qualityGate.length) bullet(`quality gate: ${task.qualityGate.join(" && ")}`);
      if (dryRun) bullet(c.yellow("dry run: nothing will be dispatched or written"));
    }
    const engine = new Engine({
      agent,
      runner,
      store: new FileStore(path17.join(root, ".ctxmux", "state")),
      gates,
      tracker,
      /*
       * Verify a delegated agent's work where that work actually is.
       *
       * Its changes are on a branch in the forge, not in this checkout. Without this the
       * quality gate compiled whatever the developer happened to have open and reported the
       * verdict as the pull request's — passing over a broken change, or failing over unrelated
       * local edits, indistinguishably from a real answer.
       *
       * A fresh worktree has no dependencies, so they are installed before the gates run. That
       * is the whole point of doing it here rather than in the agent's sandbox: this machine
       * has the credentials for the private registry, and the vendor's does not.
       */
      ...agent.kind === "delegated" ? {
        verifyRunner: async (result) => {
          const branch = result.location?.branch;
          if (!branch) return null;
          const prepared = await LocalRunner.atRef({ root, ref: branch });
          verifyWorktrees.push(prepared.runner);
          if (prepared.note && !asJson) bullet(c.dim(prepared.note));
          const hasDeps = await fs15.access(path17.join(prepared.runner.cwd, "node_modules")).then(() => true, () => false);
          if (!hasDeps && profile.packageManager) {
            if (!asJson) bullet(c.dim(`installing dependencies with ${profile.packageManager}\u2026`));
            const install = await prepared.runner.exec(
              profile.packageManager,
              ["install", "--frozen-lockfile"],
              { timeoutMs: 10 * 6e4 }
            );
            if (install.code !== 0) {
              warn(
                `Could not install dependencies to verify the change: ${(install.stderr || install.stdout).trim().split("\n").slice(-3).join(" ")}`
              );
              return null;
            }
          }
          return prepared.runner;
        }
      } : {},
      renderPrompt: (t, feedback) => renderPrompt({
        task: t,
        ...context ? { context } : {},
        ...index ? { index } : {},
        ...feedback ? { feedback } : {},
        repoBudget: flagNumber(args, "repo-budget", {
          default: 3e3,
          min: 0
        }),
        // A delegated agent works inside a checkout and reads the repository's own config,
        // so inlining it again both duplicates what it has and overruns the issue body.
        audience: agent.kind === "delegated" ? "delegated" : "driven"
      }),
      policy: {
        ...DEFAULT_POLICY,
        ...args.flags.has("max-rounds") ? {
          maxFeedbackRounds: flagNumber(args, "max-rounds", {
            default: 2,
            min: 0,
            max: 20
          })
        } : {}
      },
      ...dryRun ? { dryRun: true } : {}
    });
    if (!asJson) {
      attachReporter(engine, verbose);
      heading("Run");
    }
    let run3 = await engine.run(task);
    const remaining = chain.slice(1);
    let activeTrajectory = trajectory;
    for (const nextAgent of remaining) {
      if (run3.state !== "escalated" && run3.state !== "failed") break;
      const pkg = buildHandoff({
        task,
        trajectory: activeTrajectory,
        reason: run3.terminalReason ?? `ended in "${run3.state}"`,
        fromAgentId: activeTrajectory.meta.agentId,
        runId: run3.id,
        round: run3.feedbackRound,
        ...run3.result ? { result: run3.result } : {},
        gateOutcomes: run3.gateOutcomes
      });
      heading(`Handing over to ${nextAgent}`);
      bullet(run3.terminalReason?.split("\n")[0] ?? `previous agent ended in "${run3.state}"`);
      if (pkg.deadEnds.length > 0) {
        bullet(`carrying ${pkg.deadEnds.length} approach(es) already ruled out`);
      }
      const handoffTask = { ...task, id: `${task.id}-via-${nextAgent}` };
      const nextTrajectory = new Trajectory({
        runId: `run-${handoffTask.id}`,
        taskId: handoffTask.id,
        agentId: nextAgent,
        round: 0,
        startedAt: Date.now()
      });
      let handoffAgent;
      try {
        handoffAgent = await resolveAgent({
          ...resolveOptions,
          agent: nextAgent,
          trajectory: nextTrajectory
        });
      } catch (err) {
        warn(`Could not hand over to ${nextAgent}: ${err.message}`);
        break;
      }
      const health2 = await handoffAgent.preflight();
      if (!health2.ok) {
        warn(`${nextAgent} is unavailable: ${health2.detail.split(".")[0]}`);
        continue;
      }
      await writeTrace(root, run3.id, activeTrajectory, dryRun);
      activeTrajectory = nextTrajectory;
      activeTrajectory.attribute(handoffAgent.id, runner.cwd);
      const handoffEngine = new Engine({
        agent: handoffAgent,
        runner,
        store: new FileStore(path17.join(root, ".ctxmux", "state")),
        gates,
        tracker,
        renderPrompt: () => renderHandoff(pkg, { tier: handoffTier }),
        policy: { ...DEFAULT_POLICY },
        ...dryRun ? { dryRun: true } : {}
      });
      attachReporter(handoffEngine, verbose);
      run3 = await handoffEngine.run(handoffTask);
    }
    await writeTrace(root, run3.id, activeTrajectory, dryRun);
    for (const w of verifyWorktrees) await w.discard().catch(() => {
    });
    let publishFailed = false;
    const canPublish = openPr && agent.kind === "driven";
    if (canPublish && !dryRun) {
      const branch = runner.location().branch;
      try {
        const { forge, baseBranch } = await resolvePublishTarget(resolveOptions, root);
        const published = await publishRun({
          run: run3,
          runner,
          forge,
          branch,
          baseBranch,
          agentId: agent.id
        });
        if (run3.result) {
          run3.result.location = { ...run3.result.location ?? {}, prUrl: published.url, ...branch ? { branch } : {} };
          await new FileStore(path17.join(root, ".ctxmux", "state")).save(run3.id, run3);
        }
        if (!asJson) {
          heading(published.created ? "Pull request" : "Pull request (already open)");
          bullet(published.url);
        }
      } catch (err) {
        publishFailed = true;
        if (!asJson) {
          error(
            err instanceof PublishError ? `Could not publish the work: ${err.message}` : `Could not publish the work: ${err.message}`
          );
          if (err instanceof PublishError && err.hint) info("    " + c.dim(err.hint));
        }
      }
    } else if (canPublish && dryRun) {
      if (!asJson) bullet(c.yellow("dry run: would push the branch and open a pull request"));
    }
    await reclaim();
    const worktree = runner.location().worktree ?? null;
    const outcome = asJson ? exitCodeFor(run3, dryRun) : reportOutcome(run3, isolated ? worktree : null, dryRun);
    const code = publishFailed && outcome === 0 ? 1 : outcome;
    if (asJson) {
      info(JSON.stringify(summarise(run3, isolated ? worktree : null, code)));
      await reclaim();
      return code;
    }
    const smells = activeTrajectory.length > 0 ? inspect(activeTrajectory) : [];
    if (smells.length > 0) {
      heading("What the agent did");
      for (const smell of smells) {
        const tag = smell.severity === "block" ? c.red(smell.severity) : c.yellow(smell.severity);
        bullet(`${tag} ${smell.detail}`);
        info(`      ${c.dim(smell.advice)}`);
      }
    }
    if (activeTrajectory.length > 0 && !dryRun) {
      info("");
      info(c.dim(`  ${activeTrajectory.length} step(s) recorded \u2014 ctxmux trace ${run3.id}`));
      const otlp = flagString(args, "otlp") ?? endpointFromEnv();
      if (otlp) {
        const exported = await exportTrajectory(activeTrajectory, {
          endpoint: otlp,
          headers: headersFromEnv()
        });
        info(c.dim(`  ${exported.detail}`));
      }
    }
    return code;
  } finally {
    await reclaim();
  }
}
async function statusCommand(args) {
  const root = path17.resolve(flagString(args, "root") ?? process.cwd());
  const store = new FileStore(path17.join(root, ".ctxmux", "state"));
  const ids = await store.list();
  if (ids.length === 0) {
    info("No runs recorded yet.");
    info(c.dim("  Start one with `ctxmux run <task>`."));
    return 0;
  }
  const runs = [];
  for (const id of ids) {
    const loaded = await store.load(id);
    if (loaded) runs.push(loaded);
  }
  const badge = {
    completed: c.green("completed"),
    in_review: c.cyan("in review"),
    escalated: c.red("needs human"),
    rejected: c.yellow("rejected"),
    failed: c.red("failed")
  };
  heading(`Runs (${runs.length})`);
  for (const run3 of runs) {
    const state = badge[run3.state] ?? run3.state;
    const cost2 = run3.result?.usage?.costUsd;
    const money = cost2 !== void 0 ? `$${cost2.toFixed(2)}`.padStart(8) : "".padStart(8);
    info(`  ${run3.task.id.padEnd(14)} ${state.padEnd(22)}${money}  ${c.dim(run3.task.title.slice(0, 44))}`);
    if (run3.terminalReason) info(`    ${c.dim(run3.terminalReason.split("\n")[0] ?? "")}`);
  }
  const priced = runs.filter((r) => r.result?.usage?.costUsd !== void 0);
  const total = priced.reduce((sum, r) => sum + (r.result.usage.costUsd ?? 0), 0);
  const delegated = runs.filter(
    (r) => r.result?.usage?.costUsd === void 0 && r.result?.location?.prUrl
  );
  if (priced.length > 0 || delegated.length > 0) {
    info("");
    if (priced.length > 0) {
      info(`${c.bold(`$${total.toFixed(2)}`)} across ${priced.length} run(s) that reported a cost.`);
    }
    if (delegated.length > 0) {
      info(
        c.dim(
          `${delegated.length} run(s) went to a cloud agent, which bills separately \u2014 see your provider\u2019s usage page.`
        )
      );
    }
  }
  const needsHuman = runs.filter((r) => r.state === "escalated" || r.state === "in_review");
  if (needsHuman.length > 0) {
    info("");
    info(`${needsHuman.length} run(s) waiting on you.`);
  }
  return 0;
}

// packages/cli/src/commands/event.ts
import { promises as fs16 } from "node:fs";
import * as path18 from "node:path";
var DEFAULT_BOTS = ["Copilot", "copilot-swe-agent[bot]", "github-copilot[bot]", "github-actions[bot]"];
function normalizeGitHubEvent(eventName, payload, runId, receivedAt = Date.now()) {
  const events = [];
  if (eventName === "pull_request_review" && payload.review) {
    const state = payload.review.state?.toLowerCase();
    events.push({
      kind: "review_submitted",
      runId,
      actor: payload.review.user?.login ?? "unknown",
      body: payload.review.body ?? "",
      state: state === "approved" ? "approved" : state === "changes_requested" ? "changes_requested" : "commented",
      receivedAt
    });
  }
  if (eventName === "pull_request_review_comment" && payload.comment) {
    events.push({
      kind: "review_comment",
      runId,
      actor: payload.comment.user?.login ?? "unknown",
      body: payload.comment.body ?? "",
      ...payload.comment.path ? { file: payload.comment.path } : {},
      ...payload.comment.line != null ? { line: payload.comment.line } : {},
      receivedAt
    });
  }
  if (eventName === "issue_comment" && payload.comment) {
    if (payload.issue?.pull_request) {
      events.push({
        kind: "issue_comment",
        runId,
        actor: payload.comment.user?.login ?? "unknown",
        body: payload.comment.body ?? "",
        receivedAt
      });
    }
  }
  if (eventName === "pull_request" && payload.action === "closed" && payload.pull_request) {
    events.push({
      kind: payload.pull_request.merged ? "pr_merged" : "pr_closed",
      runId,
      actor: "system",
      receivedAt
    });
  }
  return events;
}
async function eventCommand(args) {
  const root = path18.resolve(flagString(args, "root") ?? process.cwd());
  const dryRun = flagBool(args, "dry-run", "n");
  const eventName = flagString(args, "event") || process.env["GITHUB_EVENT_NAME"] || void 0;
  const payloadPath = flagString(args, "payload") || process.env["GITHUB_EVENT_PATH"] || void 0;
  const runId = flagString(args, "run");
  if (!eventName || !payloadPath) {
    warn("Nothing to process.");
    info("");
    info("  ctxmux event --event pull_request_review --payload ./event.json --run run-T-1");
    info(c.dim("  Inside a GitHub Action, GITHUB_EVENT_NAME and GITHUB_EVENT_PATH are used automatically."));
    return 1;
  }
  let payload;
  try {
    payload = JSON.parse(await fs16.readFile(payloadPath, "utf8"));
  } catch (err) {
    error(`Could not read the event payload at ${payloadPath}: ${err.message}`);
    return 1;
  }
  const store = new FileStore(path18.join(root, ".ctxmux", "state"));
  let targetRun = runId;
  if (!targetRun) {
    const prNumber = payload.pull_request?.number ?? payload.issue?.number;
    const matches = [];
    if (prNumber !== void 0) {
      for (const id of await store.list()) {
        const run3 = await store.load(id);
        if (run3?.result?.location?.prUrl?.endsWith(`/pull/${prNumber}`)) matches.push(id);
      }
    }
    if (matches.length > 1) {
      error(`${matches.length} runs claim pull request #${prNumber}: ${matches.join(", ")}.`);
      info("    " + c.dim("Say which one with --run <id>."));
      return 1;
    }
    targetRun = matches[0];
  }
  if (!targetRun) {
    if (flagString(args, "if-no-run") === "ignore") {
      info("No run matches this event; nothing to do.");
      return 0;
    }
    error(`No run here owns pull request #${payload.pull_request?.number ?? payload.issue?.number}.`);
    info("");
    info("    " + c.dim("Run state lives in .ctxmux/state/, which is not committed \u2014 so a workflow"));
    info("    " + c.dim("reacting to a review cannot see what the workflow that started the run wrote."));
    info("    " + c.dim("Fetch it first with `ctxmux state pull`, name the run with --run <id>,"));
    info("    " + c.dim("or pass --if-no-run ignore if events about other runs are expected."));
    return 1;
  }
  const existing = await store.load(targetRun);
  if (!existing) {
    warn(`Run "${targetRun}" is not recorded here.`);
    return 1;
  }
  const coalescer = new FeedbackCoalescer({
    botLogins: DEFAULT_BOTS,
    currentRound: () => existing.feedbackRound
  });
  const normalized = normalizeGitHubEvent(eventName, payload, targetRun);
  let accepted = 0;
  for (const event of normalized) {
    if (coalescer.add(event)) accepted += 1;
  }
  heading("Event");
  bullet(`${eventName}${payload.action ? `.${payload.action}` : ""} -> ${targetRun}`);
  bullet(`${normalized.length} normalised, ${accepted} accepted`);
  if (accepted === 0) {
    info("");
    success("Nothing actionable (bot activity, or an empty comment).");
    return 0;
  }
  const coalesced = coalescer.flush(Date.now(), { force: true });
  if (coalesced.length === 0) {
    success("Nothing actionable after coalescing.");
    return 0;
  }
  for (const item of coalesced) {
    heading(
      item.event.type === "review_approved" ? "Approved" : item.event.type === "cancelled" ? "Closed" : "Changes requested"
    );
    if (item.merged > 1) bullet(`${item.merged} deliveries folded into one`);
    if (dryRun) {
      bullet(c.yellow("dry run: not submitted"));
      continue;
    }
    let applied = false;
    await store.applyOnce(`webhook:${item.dedupeKey}`, async () => {
      applied = true;
    });
    if (!applied) {
      bullet(c.dim("already handled (redelivery)"));
      continue;
    }
    const needsAgent = item.event.type === "review_changes_requested";
    let engine;
    try {
      const profile = await detectProfile(root);
      const resolveOptions = {
        root,
        ...flagString(args, "agent") ? { agent: flagString(args, "agent") } : {},
        ...flagString(args, "tracker") ? { tracker: flagString(args, "tracker") } : {},
        ...flagString(args, "repo") ? { repo: flagString(args, "repo") } : {},
        isolate: false,
        defaultQualityGate: profile.qualityGate
      };
      const agent = needsAgent ? await resolveAgent(resolveOptions) : void 0;
      const runner = agent?.capabilities.sandbox === "caller" ? (await LocalRunner.create({
        root,
        isolate: true,
        branch: `ctxmux/${existing.task.id.toLowerCase()}`,
        ...existing.result?.location?.worktree ? { worktreeDir: existing.result.location.worktree } : {}
      })).runner : void 0;
      engine = new Engine({
        ...agent ? { agent } : {},
        ...runner ? { runner } : {},
        tracker: await resolveTracker(resolveOptions),
        store,
        // Gates re-run on the next result, not on the review itself.
        gates: [],
        renderPrompt: (task, feedback) => renderPrompt({ task, ...feedback ? { feedback } : {} }),
        policy: DEFAULT_POLICY,
        // Hand off and return; a short-lived Action must not sit waiting for a cloud agent.
        waitForDelegated: false
      });
    } catch (err) {
      if (err instanceof ConfigError) {
        error(err.message);
        if (err.hint) info("    " + c.dim(err.hint));
        return 1;
      }
      throw err;
    }
    const outcome = await engine.submit(targetRun, item.event);
    if (outcome.applied) {
      bullet(`run is now ${c.bold(outcome.run?.state ?? "unknown")}`);
    } else {
      warn(outcome.reason ?? "the event was not applied");
    }
  }
  return 0;
}

// packages/cli/src/commands/eval.ts
import { promises as fs17 } from "node:fs";
import * as path19 from "node:path";

// packages/eval/src/score.ts
function countDiffLines(diff) {
  if (!diff) return 0;
  let count = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++") || line.startsWith("-") && !line.startsWith("---")) {
      count += 1;
    }
  }
  return count;
}
function outOfScope(task, files, defaultDeny = DEFAULT_DENY) {
  const { allow } = task.scope;
  const deny = [...task.scope.deny, ...defaultDeny];
  return files.filter((file) => {
    if (deny.some((p) => matchGlob(p, file))) return true;
    return allow.length > 0 && !allow.some((p) => matchGlob(p, file));
  });
}
function scoreAttempt(task, attempt) {
  const result = attempt.result;
  const files = result?.filesChanged ?? [];
  const notes = [];
  const gate = (name) => attempt.gateOutcomes.find((o) => o.gate === name);
  const qualityOutcome = gate("quality-gate");
  const integrityOutcome = gate("test-integrity");
  const qualityPassed = qualityOutcome ? qualityOutcome.verdict === "pass" : false;
  const weakenedTests = integrityOutcome?.verdict === "escalate";
  if (!qualityOutcome) notes.push("quality gate did not run");
  if (weakenedTests) notes.push("weakened existing tests");
  if (result?.status === "refused") notes.push("declined the task");
  const scope = outOfScope(task, files);
  if (scope.length > 0) notes.push(`${scope.length} file(s) outside the task scope`);
  return {
    agentId: attempt.agentId,
    agentName: attempt.agentName,
    succeeded: attempt.state === "in_review" || attempt.state === "completed",
    qualityPassed,
    outOfScopeFiles: scope,
    filesChanged: files.length,
    diffLines: countDiffLines(result?.diff),
    rounds: attempt.rounds,
    durationMs: attempt.durationMs,
    costUsd: result?.usage?.costUsd ?? null,
    weakenedTests,
    state: attempt.state,
    ...attempt.error ? { error: attempt.error } : {},
    ...attempt.worktree ? { worktree: attempt.worktree } : {},
    notes
  };
}
function rank(scores) {
  return [...scores].sort((a, b) => {
    if (a.weakenedTests !== b.weakenedTests) return a.weakenedTests ? 1 : -1;
    if (a.succeeded !== b.succeeded) return a.succeeded ? -1 : 1;
    if (a.qualityPassed !== b.qualityPassed) return a.qualityPassed ? -1 : 1;
    if (a.outOfScopeFiles.length !== b.outOfScopeFiles.length) {
      return a.outOfScopeFiles.length - b.outOfScopeFiles.length;
    }
    if (a.rounds !== b.rounds) return a.rounds - b.rounds;
    if (a.diffLines !== b.diffLines) return a.diffLines - b.diffLines;
    const aCost = a.costUsd ?? Number.POSITIVE_INFINITY;
    const bCost = b.costUsd ?? Number.POSITIVE_INFINITY;
    if (aCost !== bCost) return aCost - bCost;
    return a.durationMs - b.durationMs;
  });
}

// packages/eval/src/report.ts
function ms(value) {
  return value < 1e3 ? `${value}ms` : `${(value / 1e3).toFixed(1)}s`;
}
function cost(value) {
  return value === null ? "\u2014" : `$${value.toFixed(3)}`;
}
function verdict(score) {
  if (score.weakenedTests) return "disqualified";
  if (score.succeeded) return score.outOfScopeFiles.length > 0 ? "passed, out of scope" : "passed";
  if (score.state === "rejected") return "rejected by gates";
  if (score.state === "escalated") return "needs a human";
  if (score.state === "ready" || score.state === "discovered") return "not attempted";
  return "failed";
}
function renderTable(result) {
  const rows = result.scores.map((s, i) => ({
    rank: s.weakenedTests || !s.succeeded ? "\u2014" : String(i + 1),
    agent: s.agentName,
    verdict: verdict(s),
    quality: s.qualityPassed ? "pass" : "fail",
    scope: s.outOfScopeFiles.length === 0 ? "clean" : `${s.outOfScopeFiles.length} outside`,
    files: String(s.filesChanged),
    diff: String(s.diffLines),
    rounds: String(s.rounds),
    time: ms(s.durationMs),
    cost: cost(s.costUsd)
  }));
  const headers = ["#", "agent", "verdict", "tests", "scope", "files", "diff", "rounds", "time", "cost"];
  const keys = ["rank", "agent", "verdict", "quality", "scope", "files", "diff", "rounds", "time", "cost"];
  const widths = keys.map(
    (key, i) => Math.max(headers[i].length, ...rows.map((r) => r[key].length))
  );
  const line = (cells) => cells.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd();
  const out = [line(headers), line(widths.map((w) => "-".repeat(w)))];
  for (const row of rows) out.push(line(keys.map((k) => row[k])));
  return out.join("\n");
}
function renderDetails(result) {
  const out = [];
  for (const score of result.scores) {
    const lines = [];
    if (score.notes.length) lines.push(...score.notes.map((n) => `  - ${n}`));
    if (score.outOfScopeFiles.length) {
      lines.push(`  - touched: ${score.outOfScopeFiles.slice(0, 5).join(", ")}`);
    }
    if (score.error) lines.push(`  - ${score.error.split("\n")[0]}`);
    if (score.worktree) lines.push(`  - review: cd ${score.worktree} && git diff`);
    if (lines.length) out.push(`${score.agentName}:`, ...lines);
  }
  for (const skip of result.skipped) {
    out.push(`${skip.agentName}: skipped \u2014 ${skip.reason}`);
  }
  return out.join("\n");
}
function renderMarkdown(result) {
  const out = [
    `# Agent comparison: ${result.task.title}`,
    "",
    `Task \`${result.task.id}\` \xB7 ${result.scores.length} agent(s) \xB7 ${ms(result.durationMs)} total`,
    "",
    "| # | Agent | Verdict | Tests | Scope | Files | Diff lines | Rounds | Time | Cost |",
    "| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |"
  ];
  result.scores.forEach((s, i) => {
    out.push(
      `| ${s.weakenedTests || !s.succeeded ? "\u2014" : i + 1} | ${s.agentName} | ${verdict(s)} | ${s.qualityPassed ? "pass" : "fail"} | ${s.outOfScopeFiles.length === 0 ? "clean" : `${s.outOfScopeFiles.length} outside`} | ${s.filesChanged} | ${s.diffLines} | ${s.rounds} | ${ms(s.durationMs)} | ${cost(s.costUsd)} |`
    );
  });
  if (result.skipped.length > 0) {
    out.push("", "## Not run", "");
    for (const skip of result.skipped) out.push(`- **${skip.agentName}** \u2014 ${skip.reason}`);
  }
  const notable = result.scores.filter((s) => s.notes.length > 0);
  if (notable.length > 0) {
    out.push("", "## Notes", "");
    for (const score of notable) {
      out.push(`- **${score.agentName}**: ${score.notes.join("; ")}`);
    }
  }
  out.push(
    "",
    "## How this was measured",
    "",
    "Every agent received the identical task, the identical gates and its own worktree branched",
    "from the same commit. Scores come from the artefact each produced \u2014 whether the project\u2019s",
    "own tests passed, which files were touched, how large the diff is \u2014 not from a model",
    "judging another model.",
    "",
    "Ranking puts correctness first: an attempt whose tests fail does not place above one that",
    "passes, however small its diff. Weakening existing tests disqualifies outright, because a",
    "suite that has been quietly loosened is worse than one that fails honestly."
  );
  return out.join("\n") + "\n";
}

// packages/eval/src/index.ts
async function runEntrant(entrant, opts) {
  const agent = entrant.agent;
  const label = entrant.label ?? agent.displayName;
  const started = Date.now();
  const { runner } = await LocalRunner.create({
    root: opts.root,
    isolate: agent.capabilities.sandbox === "caller",
    branch: `ctxmux/eval-${opts.task.id.toLowerCase()}-${agent.id}`
  });
  const store = new MemoryStore();
  const engine = new Engine({
    agent,
    runner,
    store,
    gates: opts.gates,
    renderPrompt: opts.renderPrompt,
    policy: opts.policy ?? DEFAULT_POLICY,
    ...opts.dryRun ? { dryRun: true } : {}
  });
  if (opts.onEvent) engine.on((event) => opts.onEvent(agent.id, event));
  const task = { ...opts.task, id: `${opts.task.id}-${agent.id}` };
  try {
    const run3 = await engine.run(task);
    const measuredDiff = await runner.diff().catch(() => "");
    const measuredFiles = await runner.changedFiles().catch(() => []);
    const result = run3.result ? {
      ...run3.result,
      diff: measuredDiff || run3.result.diff || "",
      filesChanged: measuredFiles.length > 0 ? measuredFiles : run3.result.filesChanged
    } : null;
    await runner.dispose().catch(() => {
    });
    const worktree = runner.location().worktree;
    return {
      agentId: agent.id,
      agentName: label,
      result,
      gateOutcomes: run3.gateOutcomes,
      rounds: run3.feedbackRound,
      durationMs: Date.now() - started,
      state: run3.state,
      ...run3.terminalReason ? { error: run3.terminalReason } : {},
      ...worktree && worktree !== opts.root ? { worktree } : {}
    };
  } catch (err) {
    await runner.dispose().catch(() => {
    });
    return {
      agentId: agent.id,
      agentName: label,
      result: null,
      gateOutcomes: [],
      rounds: 0,
      durationMs: Date.now() - started,
      state: "failed",
      error: err.message
    };
  }
}
async function runEval(opts) {
  const startedAt = Date.now();
  const skipped = [];
  const eligible = [];
  for (const entrant of opts.entrants) {
    const health = await entrant.agent.preflight();
    if (health.ok || !opts.skipUnavailable) {
      eligible.push(entrant);
      continue;
    }
    skipped.push({
      agentId: entrant.agent.id,
      agentName: entrant.label ?? entrant.agent.displayName,
      reason: health.detail
    });
  }
  const attempts = opts.concurrent ? await Promise.all(eligible.map((e) => runEntrant(e, opts))) : await eligible.reduce(
    async (acc, entrant) => [...await acc, await runEntrant(entrant, opts)],
    Promise.resolve([])
  );
  return {
    task: opts.task,
    scores: rank(attempts.map((a) => scoreAttempt(opts.task, a))),
    skipped,
    startedAt,
    durationMs: Date.now() - startedAt
  };
}

// packages/cli/src/commands/eval.ts
init_src();
function parseList(raw) {
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
}
async function evalCommand(args) {
  const root = path19.resolve(flagString(args, "root") ?? process.cwd());
  const target = args.positionals.join(" ").trim();
  const dryRun = flagBool(args, "dry-run", "n");
  const concurrent = flagBool(args, "concurrent");
  const verbose = flagBool(args, "verbose");
  if (!target) {
    warn("Nothing to evaluate.");
    info("");
    info("  ctxmux eval T-1 --agents claude,cursor,codex");
    info('  ctxmux eval "add a date helper" --agents all --dry-run');
    info("");
    info(c.dim("  Runs the same task through each agent in its own worktree and compares the results."));
    return 1;
  }
  const requested = parseList(flagString(args, "agents"));
  const names = requested.length === 0 || requested[0] === "all" ? AGENT_NAMES : requested;
  const profile = await detectProfile(root);
  const allow = parseList(flagString(args, "allow"));
  const deny = parseList(flagString(args, "deny"));
  const resolveOptions = {
    root,
    ...flagString(args, "tracker") ? { tracker: flagString(args, "tracker") } : {},
    ...flagString(args, "repo") ? { repo: flagString(args, "repo") } : {},
    ...flagString(args, "model") ? { model: flagString(args, "model") } : {},
    isolate: true,
    defaultQualityGate: profile.qualityGate,
    ...allow.length || deny.length ? { scope: { allow, deny } } : {}
  };
  let task;
  const agents = [];
  const unavailable = [];
  try {
    const tracker = await resolveTracker(resolveOptions);
    task = await tracker.get(target).catch(() => null);
    if (!task) {
      task = inlineTask(target, { qualityGate: profile.qualityGate });
      info(c.dim(`No task matched "${target}"; treating it as an ad-hoc task.`));
    }
    if (allow.length || deny.length) {
      task = { ...task, scope: { ...task.scope, allow, deny } };
    }
    for (const name of names) {
      try {
        const agent = await resolveAgent({ ...resolveOptions, agent: name });
        agents.push({ agent, label: agent.displayName });
      } catch (err) {
        if (err instanceof ConfigError) {
          unavailable.push({ name, reason: err.message });
          continue;
        }
        throw err;
      }
    }
    if (agents.length === 0) {
      error("None of the requested agents could be configured.");
      for (const item of unavailable) bullet(`${item.name}: ${item.reason}`);
      return 1;
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      error(err.message);
      if (err.hint) info("    " + c.dim(err.hint));
      return 1;
    }
    throw err;
  }
  const gates = [
    readiness(
      task.origin.tracker === "inline" ? { minBodyChars: 12, requireAcceptanceCriteria: false } : {}
    ),
    complexity(),
    producedChanges(),
    pathScope({ defaultDeny: DEFAULT_DENY }),
    testIntegrity(),
    qualityGate()
  ];
  const context = await loadContext({ root }).then(
    (ctx) => ctx.model,
    () => void 0
  );
  const index = await buildIndex(root).catch(() => void 0);
  heading(`Comparing ${agents.length} agent(s) on ${task.id}`);
  bullet(task.title);
  for (const { agent } of agents) {
    const health = await agent.preflight();
    const note = health.ok ? health.detail.includes("has not been run against the real CLI") ? c.yellow(" (adapter unverified)") : "" : c.red(` (${health.detail.split(".")[0]})`);
    bullet(`${agent.displayName} \u2014 ${agent.kind}${note}`);
  }
  for (const item of unavailable) {
    bullet(c.dim(`${item.name} \u2014 skipped: ${item.reason}`));
  }
  bullet(concurrent ? c.yellow("running concurrently \u2014 wall-clock figures will be distorted") : "running one at a time");
  if (dryRun) bullet(c.yellow("dry run: nothing will be dispatched"));
  else {
    info("");
    warn(`This dispatches ${agents.length} real agent run(s) and will cost money.`);
  }
  heading("Runs");
  const result = await runEval({
    root,
    task,
    entrants: agents.map(({ agent, label }) => ({ agent, label })),
    gates,
    renderPrompt: (t, feedback) => renderPrompt({
      task: t,
      ...context ? { context } : {},
      ...index ? { index } : {},
      ...feedback ? { feedback } : {},
      repoBudget: flagNumber(args, "repo-budget", { default: 3e3, min: 0 })
    }),
    policy: {
      ...DEFAULT_POLICY,
      ...args.flags.has("max-rounds") ? { maxFeedbackRounds: flagNumber(args, "max-rounds", { default: 2, min: 0, max: 20 }) } : {}
    },
    ...concurrent ? { concurrent: true } : {},
    skipUnavailable: true,
    ...dryRun ? { dryRun: true } : {},
    onEvent: (agentId, event) => {
      if (event.type === "run:state") info(`  ${agentId.padEnd(14)} ${c.dim("->")} ${event.to}`);
      else if (event.type === "agent:finished") {
        info(`  ${agentId.padEnd(14)} ${c.cyan(event.status)}, ${event.filesChanged} file(s)`);
      } else if (verbose && event.type === "gate:result" && event.outcome.verdict !== "pass") {
        info(`  ${agentId.padEnd(14)} ${c.yellow(event.outcome.gate)}: ${event.outcome.reason ?? ""}`);
      }
    }
  });
  heading("Results");
  info(renderTable(result));
  if (unavailable.length > 0) {
    info("");
    for (const item of unavailable) {
      info(`  ${c.dim(`${item.name} was not compared: ${item.reason}`)}`);
    }
  }
  const details = renderDetails(result);
  if (details) {
    heading("Details");
    info(details);
  }
  const out = flagString(args, "out");
  if (out) {
    const abs = path19.resolve(root, out);
    await fs17.mkdir(path19.dirname(abs), { recursive: true });
    await writeFileAtomic(abs, renderMarkdown(result));
    info("");
    success(`Wrote the comparison to ${out}`);
  }
  const winner = result.scores.find((s) => s.succeeded && !s.weakenedTests);
  info("");
  if (winner) {
    success(`${winner.agentName} produced the best result for this task.`);
    info(c.dim("  Read the diffs before trusting the ranking \u2014 these are measurements, not judgement."));
  } else if (result.scores.length > 0) {
    warn("No agent produced a change that passed every gate.");
  }
  return 0;
}

// packages/cli/src/commands/learn.ts
import { promises as fs19 } from "node:fs";
import * as path21 from "node:path";
init_src();

// packages/learn/src/signals.ts
var UNINFORMATIVE_GATES = /* @__PURE__ */ new Set(["in-flight-cap", "produced-changes", "readiness", "complexity"]);
function extractSignals(run3) {
  const signals = [];
  const at = Date.now();
  const source = { runId: run3.id, taskId: run3.task.id };
  for (const outcome of run3.gateOutcomes) {
    if (outcome.verdict === "pass") continue;
    if (UNINFORMATIVE_GATES.has(outcome.gate)) continue;
    const text = [outcome.reason, outcome.hint].filter(Boolean).join(" ");
    if (!text.trim()) continue;
    signals.push({
      kind: "gate",
      text,
      source: { ...source, gate: outcome.gate },
      files: filesFromText(text),
      at
    });
  }
  if (run3.feedbackRound > 0 && run3.pendingFeedback) {
    signals.push({
      kind: "correction",
      text: run3.pendingFeedback.body,
      source: { ...source, author: run3.pendingFeedback.source },
      files: run3.pendingFeedback.items?.map((i) => i.file) ?? [],
      at
    });
  }
  return signals;
}
function filesFromText(text) {
  const matches = text.match(/[\w./-]+\.[a-z]{2,4}\b/gi) ?? [];
  return [...new Set(matches)].slice(0, 10);
}

// packages/learn/src/cluster.ts
import { createHash as createHash8 } from "node:crypto";
var STOPWORDS2 = /* @__PURE__ */ new Set([
  "the",
  "this",
  "that",
  "these",
  "those",
  "and",
  "but",
  "for",
  "with",
  "from",
  "into",
  "you",
  "your",
  "should",
  "would",
  "could",
  "please",
  "can",
  "will",
  "need",
  "needs",
  "are",
  "was",
  "were",
  "has",
  "have",
  "had",
  "not",
  "use",
  "using",
  "used",
  "here",
  "there",
  "when",
  "where",
  "what",
  "which",
  "why",
  "how",
  "its",
  "it",
  "a",
  "an",
  "is",
  "be",
  "been",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "or",
  "as",
  "if",
  "we",
  "do",
  "does"
]);
function terms2(text) {
  const cleaned = text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ").replace(/[\w./-]+\.[a-z]{2,4}\b/gi, " ").replace(/https?:\/\/\S+/g, " ").toLowerCase().replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const out = /* @__PURE__ */ new Set();
  for (const raw of cleaned.split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOPWORDS2.has(raw)) continue;
    out.add(raw.replace(/(ing|ed|es|s)$/, ""));
  }
  return out;
}
function similarity(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const term of a) if (b.has(term)) shared += 1;
  return shared / Math.min(a.size, b.size);
}
function clusterId(termSet) {
  const signature = [...termSet].sort().slice(0, 12).join("-");
  return `L-${createHash8("sha256").update(signature).digest("base64url").slice(0, 10)}`;
}
function clusterSignals(signals, opts = {}) {
  const threshold = opts.threshold ?? 0.5;
  const minTasks = opts.minTasks ?? 2;
  const buckets = [];
  for (const signal of signals) {
    const termSet = terms2(signal.text);
    if (termSet.size === 0) continue;
    const match = buckets.find((b) => similarity(b.termSet, termSet) >= threshold);
    if (match) {
      match.signals.push(signal);
      for (const term of [...match.termSet]) if (!termSet.has(term)) match.termSet.delete(term);
    } else {
      buckets.push({ termSet, signals: [signal] });
    }
  }
  return buckets.map((bucket) => {
    const tasks = new Set(bucket.signals.map((s) => s.source.taskId));
    const files = [...new Set(bucket.signals.flatMap((s) => s.files))];
    return {
      id: clusterId(bucket.termSet),
      representative: pickRepresentative(bucket.signals.map((s) => s.text)),
      signals: bucket.signals,
      taskCount: tasks.size,
      files,
      kinds: new Set(bucket.signals.map((s) => s.kind))
    };
  }).filter((c2) => c2.taskCount >= minTasks).sort((a, b) => b.taskCount - a.taskCount || b.signals.length - a.signals.length);
}
var DEICTIC = /\b(here|there|this|that|these|those|too|also|again|instead|it)\b/gi;
function deicticCount(text) {
  return (text.match(DEICTIC) ?? []).length;
}
function pickRepresentative(texts) {
  return [...texts].sort((a, b) => {
    const byContext = deicticCount(a) - deicticCount(b);
    return byContext !== 0 ? byContext : a.length - b.length;
  })[0];
}

// packages/learn/src/propose.ts
init_src();

// packages/learn/src/ledger.ts
import { promises as fs18 } from "node:fs";
import * as path20 from "node:path";
var VERSION = 1;
var SIGNAL_TTL_MS = 90 * 24 * 60 * 60 * 1e3;
var MAX_SIGNALS = 2e3;
var Ledger = class _Ledger {
  constructor(file) {
    this.file = file;
  }
  file;
  state = { version: VERSION, entries: {}, signals: [] };
  /**
   * Set when an existing ledger could not be read, so a caller can say so.
   *
   * Starting fresh is the right recovery, but doing it silently is not: this file is where a
   * human's rejections live, and losing them without a word means the lessons they declined
   * quietly come back.
   */
  loadError = null;
  static async open(dir) {
    const ledger = new _Ledger(path20.join(dir, "learn.json"));
    await ledger.load();
    return ledger;
  }
  async load() {
    let raw;
    try {
      raw = await fs18.readFile(this.file, "utf8");
    } catch {
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed.version === VERSION) {
        this.state = parsed;
        return;
      }
      this.loadError = `ledger is version ${parsed.version}, this build reads version ${VERSION}`;
    } catch (err) {
      this.loadError = err.message;
    }
    await fs18.rename(this.file, `${this.file}.corrupt`).catch(() => {
    });
  }
  /** Why an existing ledger could not be read, if it could not. */
  get warning() {
    return this.loadError;
  }
  /**
   * Persist.
   *
   * Through the shared atomic write, whose temporary file is named per process. This wrote to a
   * fixed `learn.json.tmp`, so two invocations overlapping — which `record` documents as
   * normal, "a scheduled job and a manual invocation" — interleaved their writes into one
   * temporary file and renamed the result into place. Every human decision in it was then
   * unreadable, and `load` discarded them without a word.
   */
  async save() {
    await writeFileAtomic2(this.file, JSON.stringify(this.state, null, 2));
  }
  /**
   * Record observations.
   *
   * Duplicates are dropped by run and text: harvesting the same run twice is normal — a
   * scheduled job and a manual invocation overlapping — and must not inflate a lesson's
   * apparent recurrence.
   */
  record(signals) {
    const seen = new Set(this.state.signals.map(signalKey));
    let added = 0;
    for (const signal of signals) {
      const key = signalKey(signal);
      if (seen.has(key)) continue;
      seen.add(key);
      this.state.signals.push(signal);
      added += 1;
    }
    this.prune();
    return added;
  }
  prune() {
    const cutoff = Date.now() - SIGNAL_TTL_MS;
    this.state.signals = this.state.signals.filter((s) => s.at >= cutoff);
    if (this.state.signals.length > MAX_SIGNALS) {
      this.state.signals = this.state.signals.slice(-MAX_SIGNALS);
    }
  }
  get signals() {
    return this.state.signals;
  }
  get entries() {
    return Object.values(this.state.entries).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  status(id) {
    return this.state.entries[id]?.status ?? null;
  }
  /** Whether a lesson should be shown, given what a human has already decided about it. */
  shouldPropose(id) {
    const status = this.state.entries[id]?.status;
    return status !== "applied" && status !== "rejected";
  }
  mark(id, status, lesson, taskCount, note) {
    this.state.entries[id] = {
      id,
      status,
      lesson,
      taskCount,
      updatedAt: Date.now(),
      ...note ? { note } : {}
    };
  }
  /**
   * Forget a decision, so the lesson can be proposed again.
   *
   * Rejections should be durable, not permanent. A team's conventions change, and a lesson
   * declined a year ago may be exactly right now.
   */
  reconsider(id) {
    if (!this.state.entries[id]) return false;
    delete this.state.entries[id];
    return true;
  }
  /**
   * Drop observations that have already produced an applied lesson.
   *
   * Takes the observations themselves, keyed exactly as `record` dedupes them. The previous
   * version took lesson ids and compared them against `taskId:runId`, which never matched
   * anything — so the pruning this class documents as one of its two jobs did not happen, and
   * settled evidence competed with fresh evidence for the retention cap for as long as the
   * ledger lived.
   */
  compact(appliedSignalKeys) {
    const settled = new Set(appliedSignalKeys);
    if (settled.size === 0) return 0;
    const before = this.state.signals.length;
    this.state.signals = this.state.signals.filter((s) => !settled.has(signalKey(s)));
    return before - this.state.signals.length;
  }
  stats() {
    const entries = Object.values(this.state.entries);
    return {
      signals: this.state.signals.length,
      proposed: entries.filter((e) => e.status === "proposed").length,
      applied: entries.filter((e) => e.status === "applied").length,
      rejected: entries.filter((e) => e.status === "rejected").length
    };
  }
};
function signalKey(signal) {
  return `${signal.source.runId}:${signal.text}`;
}

// packages/learn/src/propose.ts
function asGuidance(text) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const patterns = [
    [/^\d+ file\(s\) changed outside the task's scope/i, () => "Change only the files the task requires. Config files, manifests and lockfiles are out of scope unless the task says otherwise."],
    // Commands are usually backticked and usually multi-word, so match to the closing
    // backtick rather than to the first space.
    [/^`([^`]+)`\s+failed/i, (m) => `Run \`${m[1]}\` before finishing, and fix every failure it reports.`],
    [/^([^\s`]+)\s+failed/i, (m) => `Run \`${m[1]}\` before finishing, and fix every failure it reports.`],
    [/test files were weakened/i, () => "Never weaken a test to make a suite pass. A failing test means the implementation is wrong."],
    [/^(?:please\s+)?(use|prefer|avoid|do not|don't|never|always)\b/i, () => trimmed],
    [/\b(already exists|duplicat|reinvent)/i, () => `${trimmed} Search for an existing implementation before writing a new one.`]
  ];
  for (const [pattern, rewrite] of patterns) {
    const match = trimmed.match(pattern);
    if (match) return sentence(rewrite(match));
  }
  return sentence(trimmed);
}
function sentence(text) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}
function globsFor(files) {
  const dirs = /* @__PURE__ */ new Set();
  for (const file of files) {
    const parts = file.split("/");
    if (parts.length > 1) dirs.add(`${parts.slice(0, -1).join("/")}/**`);
  }
  return dirs.size > 0 && dirs.size <= 3 ? [...dirs] : [];
}
function findTarget(cluster, context) {
  const lessonTerms = terms2(cluster.representative);
  let best = { score: 0, result: null };
  for (const skill of context.skills) {
    const score = similarity(lessonTerms, terms2(`${skill.name} ${skill.description} ${skill.body}`));
    if (score > best.score) best = { score, result: { kind: "skill", node: skill } };
  }
  for (const rule of context.rules) {
    const score = similarity(lessonTerms, terms2(`${rule.name} ${rule.description ?? ""} ${rule.body}`));
    if (score > best.score) best = { score, result: { kind: "rule", node: rule } };
  }
  return best.score >= 0.35 ? best.result : null;
}
var SLUG_NOISE = /* @__PURE__ */ new Set([
  "rather",
  "than",
  "instead",
  "before",
  "after",
  "always",
  "never",
  "please",
  "should",
  "must",
  "make",
  "sure",
  "this",
  "that",
  "here",
  "there",
  "when",
  "while",
  "about",
  "into",
  "onto",
  "over",
  "each",
  "every",
  "some",
  "other"
]);
function slugFor(lesson) {
  const words = lesson.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !SLUG_NOISE.has(w));
  const slug2 = [...new Set(words)].slice(0, 4).join("-");
  return slug2 || "learned-convention";
}
async function uniqueName(base, clusterId2, sourceDir, taken, read2) {
  const pathFor = (name) => `${sourceDir}/rules/${name}.md`;
  const free = async (name) => !taken.has(pathFor(name)) && (await read2?.(pathFor(name)) ?? null) === null;
  if (await free(base)) return base;
  return `${base}-${clusterId2.toLowerCase().replace(/^l-/, "")}`;
}
var MARKER = "<!-- learned -->";
function appendGuidance(body, lesson) {
  const existing = terms2(body);
  if (similarity(terms2(lesson), existing) >= 0.8) return null;
  const trimmed = body.trimEnd();
  return trimmed.includes(MARKER) ? `${trimmed}
- ${lesson}
` : `${trimmed}

${MARKER}

**Learned from review:**

- ${lesson}
`;
}
function frontmatter(data, body) {
  const clean2 = Object.fromEntries(
    Object.entries(data).filter(
      ([, v]) => v !== void 0 && v !== null && !(Array.isArray(v) && v.length === 0)
    )
  );
  return serializeFrontmatter(clean2, body);
}
async function propose(clusters, opts) {
  const sourceDir = opts.sourceDir ?? ".ctxmux";
  const proposals = [];
  const taken = /* @__PURE__ */ new Set();
  for (const cluster of clusters) {
    const lesson = asGuidance(cluster.representative);
    const globs = globsFor(cluster.files);
    const evidence = cluster.signals.slice(0, 5).map((s) => ({
      taskId: s.source.taskId,
      source: s.source.author ?? s.source.gate ?? s.kind,
      text: s.text.length > 200 ? `${s.text.slice(0, 200)}\u2026` : s.text
    }));
    const signalKeys = cluster.signals.map(signalKey);
    const target = findTarget(cluster, opts.context);
    if (target) {
      const path26 = target.kind === "skill" ? `${sourceDir}/skills/${target.node.name}/SKILL.md` : `${sourceDir}/rules/${target.node.name}.md`;
      const before = await opts.read?.(path26) ?? null;
      const amended = appendGuidance(target.node.body, lesson);
      if (!amended) continue;
      const content = before !== null ? serializeFrontmatter(parseFrontmatter(before, path26).data, amended) : target.kind === "skill" ? frontmatter(
        {
          name: target.node.name,
          description: target.node.description,
          ...target.node.globs.length ? { globs: target.node.globs } : {}
        },
        amended
      ) : frontmatter(
        {
          name: target.node.name,
          ...target.node.description ? { description: target.node.description } : {},
          ...target.node.globs.length ? { globs: target.node.globs } : {},
          ...target.node.alwaysApply ? { alwaysApply: true } : {}
        },
        amended
      );
      proposals.push({
        id: cluster.id,
        kind: target.kind === "skill" ? "amend-skill" : "amend-rule",
        lesson,
        path: path26,
        target: target.node.name,
        taskCount: cluster.taskCount,
        evidence,
        signalKeys,
        globs,
        content,
        ...before !== null ? { before } : {}
      });
      continue;
    }
    const name = await uniqueName(slugFor(lesson), cluster.id, sourceDir, taken, opts.read);
    taken.add(`${sourceDir}/rules/${name}.md`);
    proposals.push({
      id: cluster.id,
      kind: "new-rule",
      lesson,
      path: `${sourceDir}/rules/${name}.md`,
      taskCount: cluster.taskCount,
      evidence,
      signalKeys,
      globs,
      content: frontmatter(
        {
          name,
          description: lesson.length > 90 ? `${lesson.slice(0, 87)}...` : lesson,
          ...globs.length ? { globs } : {}
        },
        `${lesson}

${MARKER}

_Learned from review feedback across ${cluster.taskCount} tasks._`
      )
    });
  }
  return proposals;
}

// packages/learn/src/compile.ts
init_src();
import { createHash as createHash9 } from "node:crypto";

// packages/learn/src/success.ts
function isExemplary(run3, trajectory) {
  const reasons = [];
  if (run3.state !== "completed" && run3.state !== "in_review") {
    reasons.push(`ended in "${run3.state}"`);
  }
  if (run3.feedbackRound > 0) {
    reasons.push(`needed ${run3.feedbackRound} correction round(s)`);
  }
  if (run3.attempt > 0) {
    reasons.push(`took ${run3.attempt + 1} attempt(s)`);
  }
  const failedGates = run3.gateOutcomes.filter((o) => o.verdict !== "pass");
  if (failedGates.length > 0) {
    reasons.push(`${failedGates.map((g) => g.gate).join(", ")} did not pass`);
  }
  const smells = inspect(trajectory);
  if (smells.length > 0) {
    reasons.push(`trajectory shows ${smells.map((s) => s.name).join(", ")}`);
  }
  if (trajectory.of("tool").length < 2) {
    reasons.push("too few steps to describe an approach");
  }
  return { ok: reasons.length === 0, reasons };
}
var COMMAND_TOOL = /\b(bash|shell|exec|run|command|terminal)\b/i;
var VERIFY_COMMAND = /\b(test|spec|lint|typecheck|tsc|vitest|jest|pytest|check|ci)\b/i;
var READ_COMMAND = /\b(ls|cat|find|grep|rg|head|tail|status|log|diff|show|which|pwd|tree|stat)\b/i;
function moveOf(step) {
  if (step.kind !== "tool") return null;
  if (COMMAND_TOOL.test(step.name)) {
    const leading = step.summary.trim().split(/[\s;|&]+/)[0] ?? "";
    if (READ_COMMAND.test(leading)) return "explore";
    if (VERIFY_COMMAND.test(step.summary)) return "verify";
    if (READ_COMMAND.test(step.summary)) return "explore";
    return "run";
  }
  const data = step.data;
  return data?.mutating ? "change" : "explore";
}
function shapeOf(trajectory) {
  const moves = [];
  for (const step of trajectory.all) {
    const move = moveOf(step);
    if (!move) continue;
    if (moves.at(-1) !== move) moves.push(move);
  }
  return moves;
}
function shapeKey(shape) {
  return shape.join(">");
}
function describeShape(shape) {
  const phrasing = {
    explore: "Read the code you are about to change, and whatever tests it",
    change: "Make the change",
    verify: "Run the project's own checks and fix what they report",
    run: "Run the command the task needs"
  };
  return shape.map((m) => phrasing[m]);
}

// packages/learn/src/compile.ts
function toExemplar(input) {
  return {
    taskId: input.taskId,
    runId: input.runId,
    taskText: input.taskText,
    shape: shapeOf(input.trajectory),
    files: input.files,
    at: Date.now()
  };
}
function patternId(shape) {
  return `A-${createHash9("sha256").update(shapeKey(shape)).digest("base64url").slice(0, 10)}`;
}
function findApproaches(exemplars, opts = {}) {
  const minTasks = opts.minTasks ?? 3;
  const minLength = opts.minLength ?? 2;
  const byShape = /* @__PURE__ */ new Map();
  for (const exemplar of exemplars) {
    if (exemplar.shape.length < minLength) continue;
    const key = shapeKey(exemplar.shape);
    byShape.set(key, [...byShape.get(key) ?? [], exemplar]);
  }
  const patterns = [];
  for (const [, group] of byShape) {
    const tasks = new Set(group.map((e) => e.taskId));
    if (tasks.size < minTasks) continue;
    patterns.push({
      id: patternId(group[0].shape),
      shape: group[0].shape,
      exemplars: group,
      taskCount: tasks.size,
      commonTerms: sharedTerms(group.map((e) => e.taskText))
    });
  }
  return patterns.sort((a, b) => b.taskCount - a.taskCount);
}
function sharedTerms(texts) {
  if (texts.length === 0) return [];
  const counts = /* @__PURE__ */ new Map();
  for (const text of texts) {
    for (const term of terms2(text)) counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  const threshold = Math.ceil(texts.length * 0.6);
  return [...counts].filter(([, n]) => n >= threshold).sort((a, b) => b[1] - a[1]).map(([term]) => term).slice(0, 6);
}
function nameFor(pattern) {
  if (pattern.commonTerms.length >= 2) {
    return `${pattern.commonTerms.slice(0, 3).join("-")}-approach`.replace(/[^a-z0-9-]/g, "");
  }
  return `${pattern.shape.join("-then-")}`;
}
function descriptionFor(pattern) {
  const what = pattern.commonTerms.length >= 2 ? `tasks involving ${pattern.commonTerms.slice(0, 3).join(", ")}` : "a task of this kind";
  return `Use for ${what} \u2014 an approach that has worked ${pattern.taskCount} times here without needing correction.`;
}
function alreadyCovered(pattern, context) {
  const proposed = terms2(describeShape(pattern.shape).join(" "));
  for (const skill of context.skills) {
    if (similarity(proposed, terms2(`${skill.description} ${skill.body}`)) >= 0.6) return true;
  }
  return false;
}
function proposeApproaches(patterns, context, opts = {}) {
  const sourceDir = opts.sourceDir ?? ".ctxmux";
  const proposals = [];
  for (const pattern of patterns) {
    if (alreadyCovered(pattern, context)) continue;
    const name = nameFor(pattern);
    const steps = describeShape(pattern.shape);
    const body = [
      `## The approach`,
      "",
      ...steps.map((step, i) => `${i + 1}. ${step}`),
      "",
      "## Why this is here",
      "",
      `This sequence was what ${pattern.taskCount} tasks in this repository had in common when`,
      "they succeeded first time \u2014 no correction rounds, every check passing.",
      "",
      /*
       * The caveat is not decoration. A skill that reads as a procedure invites an agent to
       * follow it when it does not fit, and the tasks where an agent earns its cost are
       * exactly the ones where the steps have to vary.
       */
      "_It describes what has worked, not what must happen. Where the task calls for something",
      "different, do the different thing \u2014 this is evidence, not a procedure._"
    ].join("\n");
    proposals.push({
      id: pattern.id,
      kind: "new-rule",
      lesson: `An approach that has worked ${pattern.taskCount} times: ${pattern.shape.join(" \u2192 ")}`,
      path: `${sourceDir}/skills/${name}/SKILL.md`,
      taskCount: pattern.taskCount,
      evidence: pattern.exemplars.slice(0, 5).map((e) => ({
        taskId: e.taskId,
        source: "succeeded first time",
        text: e.taskText.split("\n")[0]?.slice(0, 120) ?? ""
      })),
      globs: [],
      // Approaches come from trajectories, not from recorded observations, so there is no
      // evidence in the ledger for an applied one to retire.
      signalKeys: [],
      // Serialised rather than interpolated. The values here happen to be alphanumeric today,
      // but a generated file that breaks its own loader is a failure worth being structurally
      // unable to reach rather than one that depends on a term extractor staying strict.
      content: serializeFrontmatter({ name, description: descriptionFor(pattern) }, body)
    });
  }
  return proposals;
}

// packages/learn/src/index.ts
async function learn(opts) {
  const signals = opts.ledger.signals;
  const clusters = clusterSignals(signals, opts.cluster ?? {});
  const eligible = opts.includeDecided ? clusters : clusters.filter((c2) => opts.ledger.shouldPropose(c2.id));
  const suppressed = opts.includeDecided ? [] : clusters.filter((c2) => !opts.ledger.shouldPropose(c2.id)).map((c2) => ({
    id: c2.id,
    lesson: c2.representative,
    status: opts.ledger.status(c2.id) ?? "unknown"
  }));
  const proposals = await propose(eligible, {
    context: opts.context,
    ...opts.sourceDir ? { sourceDir: opts.sourceDir } : {},
    ...opts.read ? { read: opts.read } : {}
  });
  const exemplars = opts.exemplars ?? [];
  const patterns = findApproaches(exemplars, opts.approach ?? {}).filter(
    (p) => opts.includeDecided || opts.ledger.shouldPropose(p.id)
  );
  const approaches = proposeApproaches(patterns, opts.context, {
    ...opts.sourceDir ? { sourceDir: opts.sourceDir } : {}
  });
  return {
    proposals,
    approaches,
    suppressed,
    signalsConsidered: signals.length,
    exemplarsConsidered: exemplars.length
  };
}

// packages/cli/src/commands/learn.ts
var LEARN_DIR = ".ctxmux/state";
function renderChange(proposal) {
  if (!proposal.before) {
    return proposal.content.split("\n").filter((l) => l.trim()).slice(0, 8).map((l) => c.green(`+ ${l}`));
  }
  const before = new Set(proposal.before.split("\n"));
  return proposal.content.split("\n").filter((line) => line.trim() && !before.has(line)).map((line) => c.green(`+ ${line}`));
}
async function loadTrajectory(root, runId) {
  const file = path21.join(root, ".ctxmux/state/traces", `${encodeURIComponent(runId)}.json`);
  try {
    return Trajectory.from(JSON.parse(await fs19.readFile(file, "utf8")));
  } catch {
    return null;
  }
}
async function harvest(root, ledger) {
  const store = new FileStore(path21.join(root, LEARN_DIR));
  let recorded = 0;
  let nearMisses = 0;
  const exemplars = [];
  for (const id of await store.list()) {
    const run3 = await store.load(id);
    if (!run3) continue;
    if (!["completed", "in_review", "escalated", "rejected", "failed"].includes(run3.state)) continue;
    recorded += ledger.record(extractSignals(run3));
    const trajectory = await loadTrajectory(root, run3.id);
    if (!trajectory) continue;
    const verdict2 = isExemplary(run3, trajectory);
    if (!verdict2.ok) {
      if (run3.state === "completed" || run3.state === "in_review") nearMisses += 1;
      continue;
    }
    exemplars.push(
      toExemplar({
        taskId: run3.task.id,
        runId: run3.id,
        taskText: `${run3.task.title}
${run3.task.body}`,
        trajectory,
        files: run3.result?.filesChanged ?? []
      })
    );
  }
  return { recorded, exemplars, nearMisses };
}
async function learnCommand(args) {
  const root = path21.resolve(flagString(args, "root") ?? process.cwd());
  const apply = flagBool(args, "apply");
  const rejectId = flagString(args, "reject");
  const reconsiderId = flagString(args, "reconsider");
  const showAll = flagBool(args, "all");
  const minTasks = flagNumber(args, "min-tasks", { default: 2, min: 1 });
  const ledger = await Ledger.open(path21.join(root, LEARN_DIR));
  if (ledger.warning) {
    warn(`Could not read the existing ledger: ${ledger.warning}`);
    info("    " + c.dim("It has been kept as learn.json.corrupt. Starting from an empty ledger."));
  }
  const context = await loadContext({ root }).then(
    (ctx) => ctx.model,
    () => null
  );
  if (!context) {
    error("No .ctxmux/ directory here.");
    info("    " + c.dim("Learning proposes edits to your context, so there has to be one. Run `ctxmux init`."));
    return 1;
  }
  if (rejectId) {
    const found = ledger.entries.find((e) => e.id === rejectId);
    ledger.mark(rejectId, "rejected", found?.lesson ?? rejectId, found?.taskCount ?? 0, flagString(args, "note"));
    await ledger.save();
    success(`${rejectId} rejected. It will not be proposed again.`);
    info("    " + c.dim(`Changed your mind later: ctxmux learn --reconsider ${rejectId}`));
    return 0;
  }
  if (reconsiderId) {
    if (!ledger.reconsider(reconsiderId)) {
      warn(`No decision recorded for ${reconsiderId}.`);
      return 1;
    }
    await ledger.save();
    success(`${reconsiderId} will be considered again.`);
    return 0;
  }
  const harvested = await harvest(root, ledger);
  const result = await learn({
    ledger,
    context,
    read: (p) => fs19.readFile(path21.resolve(root, p), "utf8").then((t) => t, () => null),
    cluster: { minTasks },
    includeDecided: showAll,
    exemplars: harvested.exemplars,
    approach: { minTasks }
  });
  const stats = ledger.stats();
  heading("Observations");
  bullet(`${stats.signals} recorded${harvested.recorded > 0 ? ` (${harvested.recorded} new)` : ""}`);
  bullet(
    `${harvested.exemplars.length} run(s) succeeded first time` + (harvested.nearMisses > 0 ? c.dim(`, ${harvested.nearMisses} finished but needed help`) : "")
  );
  bullet(`${stats.applied} lesson(s) applied, ${stats.rejected} rejected`);
  const all = [...result.proposals, ...result.approaches];
  if (all.length === 0) {
    await ledger.save();
    info("");
    if (result.suppressed.length > 0) {
      success("Nothing new. Recurring lessons you have already decided on:");
      for (const item of result.suppressed) {
        bullet(`${c.dim(item.id)} ${item.lesson.slice(0, 70)} ${c.dim(`(${item.status})`)}`);
      }
    } else if (stats.signals === 0 && harvested.exemplars.length === 0) {
      success("Nothing recorded yet.");
      info(
        "    " + c.dim(
          "Lessons come from review comments and gate failures; approaches come from runs that succeeded first time."
        )
      );
    } else if (stats.signals === 0) {
      success(
        `Nothing new. ${harvested.exemplars.length} run(s) succeeded first time, and their approach is already captured.`
      );
    } else {
      success(`Nothing has recurred across ${minTasks}+ tasks yet.`);
      info("    " + c.dim("A point made once is a preference; one made repeatedly is a convention worth writing down."));
    }
    return 0;
  }
  if (result.proposals.length > 0) {
    heading(`${result.proposals.length} lesson(s) from what went wrong`);
  }
  for (const proposal of result.proposals) {
    info("");
    info(`${c.bold(proposal.id)}  ${c.dim(`seen across ${proposal.taskCount} tasks`)}`);
    info(`  ${proposal.lesson}`);
    info("");
    info(
      `  ${c.dim(proposal.kind === "new-rule" ? "new rule" : `amends ${proposal.target}`)} ${c.dim("->")} ${proposal.path}`
    );
    for (const line of renderChange(proposal)) info(`  ${line}`);
    info("");
    info(`  ${c.dim("because:")}`);
    for (const item of proposal.evidence.slice(0, 3)) {
      info(`    ${c.dim(`${item.taskId} (${item.source}):`)} ${item.text.split("\n")[0]?.slice(0, 80)}`);
    }
  }
  if (result.approaches.length > 0) {
    heading(`${result.approaches.length} approach(es) that keep working`);
    for (const proposal of result.approaches) {
      info("");
      info(`${c.bold(proposal.id)}  ${c.dim(`succeeded first time on ${proposal.taskCount} tasks`)}`);
      info(`  ${proposal.lesson}`);
      info("");
      info(`  ${c.dim("new skill")} ${c.dim("->")} ${proposal.path}`);
      for (const line of renderChange(proposal).slice(0, 8)) info(`  ${line}`);
      info("");
      info(`  ${c.dim("because:")}`);
      for (const item of proposal.evidence.slice(0, 3)) {
        info(`    ${c.dim(`${item.taskId}:`)} ${item.text.slice(0, 70)}`);
      }
    }
  }
  if (!apply) {
    info("");
    info("Nothing has been written.");
    info(`  ${c.bold("ctxmux learn --apply")}              ${c.dim("write these into .ctxmux/")}`);
    info(`  ${c.bold("ctxmux learn --reject <id>")}        ${c.dim("decline one, permanently")}`);
    await ledger.save();
    return 0;
  }
  heading("Applying");
  const applied = [];
  let skipped = 0;
  for (const proposal of all) {
    const abs = path21.resolve(root, proposal.path);
    const current = await fs19.readFile(abs, "utf8").then(
      (t) => t,
      () => null
    );
    if (proposal.before === void 0 && current !== null) {
      warn(`${proposal.path} already exists \u2014 left alone.`);
      info("    " + c.dim("Rename or remove it if you want this lesson written there."));
      skipped += 1;
      continue;
    }
    if (proposal.before !== void 0 && current !== null && current !== proposal.before) {
      warn(`${proposal.path} changed since this was proposed \u2014 left alone.`);
      info("    " + c.dim("Re-run `ctxmux learn` to propose it against the file as it is now."));
      skipped += 1;
      continue;
    }
    await writeFileAtomic(abs, proposal.content);
    ledger.mark(proposal.id, "applied", proposal.lesson, proposal.taskCount);
    applied.push(proposal.path);
    bullet(`${proposal.kind === "new-rule" ? "created" : "amended"} ${proposal.path}`);
  }
  const retired = ledger.compact(
    all.filter((p) => applied.includes(p.path)).flatMap((p) => p.signalKeys)
  );
  await ledger.save();
  info("");
  if (applied.length === 0) {
    warn(`Nothing was written; ${skipped} proposal(s) were left alone.`);
    return 1;
  }
  success(
    `Wrote ${applied.length} change(s) to .ctxmux/.` + (skipped > 0 ? ` ${skipped} left alone.` : "") + (retired > 0 ? c.dim(` ${retired} observation(s) retired.`) : "")
  );
  info("");
  info("Next:");
  info(`  1. ${c.bold("git diff .ctxmux/")}   ${c.dim("review what was written \u2014 these are proposals, not truth")}`);
  info(`  2. ${c.bold("ctxmux sync")}             ${c.dim("compile the change out to every agent")}`);
  return 0;
}

// packages/cli/src/commands/trace.ts
import { promises as fs20 } from "node:fs";
import * as path22 from "node:path";
var TRACE_DIR = ".ctxmux/state/traces";
async function load(root, runId) {
  const file = path22.join(root, TRACE_DIR, `${encodeURIComponent(runId)}.json`);
  try {
    return Trajectory.from(JSON.parse(await fs20.readFile(file, "utf8")));
  } catch {
    return null;
  }
}
async function list(root) {
  try {
    const files = await fs20.readdir(path22.join(root, TRACE_DIR));
    return files.filter((f) => f.endsWith(".json")).map((f) => decodeURIComponent(f.replace(/\.json$/, "")));
  } catch {
    return [];
  }
}
async function traceCommand(args) {
  const root = path22.resolve(flagString(args, "root") ?? process.cwd());
  const target = args.positionals[0];
  const limit = flagNumber(args, "limit", { default: 60, min: 1 });
  const onlyTools = flagBool(args, "tools");
  const available = await list(root);
  if (!target) {
    if (available.length === 0) {
      info("No traces recorded yet.");
      info(c.dim("  `ctxmux run` records one per run, unless --no-recovery is passed."));
      return 0;
    }
    heading(`Traces (${available.length})`);
    for (const id of available) {
      const trajectory2 = await load(root, id);
      if (!trajectory2) continue;
      const tools = trajectory2.of("tool").length;
      const result = trajectory2.of("result").at(-1);
      bullet(`${id.padEnd(20)} ${String(trajectory2.length).padStart(4)} steps, ${tools} tool call(s)  ${c.dim(result?.name ?? "incomplete")}`);
    }
    info("");
    info(c.dim(`  ctxmux trace ${available[0]}`));
    return 0;
  }
  const trajectory = await load(root, target) ?? await load(root, `run-${target}`);
  if (!trajectory) {
    error(`No trace for "${target}".`);
    if (available.length > 0) {
      info("");
      info("Available:");
      for (const id of available.slice(0, 10)) bullet(id);
    }
    return 1;
  }
  const otlp = flagString(args, "otlp") ?? (flagBool(args, "export") ? endpointFromEnv() : void 0);
  if (flagBool(args, "otlp-json")) {
    info(JSON.stringify(toOtlp(trajectory), null, 2));
    return 0;
  }
  if (otlp) {
    const result = await exportTrajectory(trajectory, { endpoint: otlp, headers: headersFromEnv() });
    if (result.ok) success(result.detail);
    else error(result.detail);
    return result.ok ? 0 : 1;
  }
  const meta = trajectory.meta;
  const elapsed = meta.endedAt ? Math.round((meta.endedAt - meta.startedAt) / 1e3) : null;
  heading(`${meta.runId} \u2014 ${meta.agentId}`);
  bullet(`task ${meta.taskId}, round ${meta.round}`);
  bullet(
    `${trajectory.length} step(s): ${trajectory.of("tool").length} tool call(s), ${trajectory.of("message").length} message(s)` + (elapsed !== null ? `, ${elapsed}s` : "")
  );
  if (trajectory.toJSON().dropped > 0) {
    bullet(c.dim(`${trajectory.toJSON().dropped} step(s) dropped to bound the record`));
  }
  heading("Timeline");
  if (onlyTools) {
    const start = meta.startedAt;
    for (const step of trajectory.of("tool").slice(-limit)) {
      const at = `${Math.round((step.at - start) / 1e3)}s`.padStart(6);
      const failed = step.data?.ok === false;
      const name = failed ? c.red(step.name) : step.name;
      info(`${at}  ${name.padEnd(20)} ${trajectory.describe(step)}`);
    }
  } else {
    info(trajectory.render({ limit }));
  }
  const smells = inspect(trajectory);
  if (smells.length === 0) {
    info("");
    success("Nothing concerning in how this was done.");
    return 0;
  }
  heading("Concerns");
  for (const smell of smells) {
    const tag = smell.severity === "block" ? c.red(smell.severity) : c.yellow(smell.severity);
    info(`  ${tag} ${c.bold(smell.name)}`);
    info(`    ${smell.detail}`);
    info(`    ${c.dim(smell.advice)}`);
    info(`    ${c.dim(`steps ${smell.evidence.slice(0, 8).join(", ")}`)}`);
  }
  if (smells.some((s) => s.severity === "block")) {
    info("");
    warn("This run did something that cannot be undone by restoring files.");
    return 2;
  }
  return 0;
}

// packages/cli/src/commands/add.ts
init_src();
import { spawn as spawn4 } from "node:child_process";
import { promises as fs21 } from "node:fs";
import * as os2 from "node:os";
import * as path23 from "node:path";
function run2(bin, args, cwd) {
  return new Promise((resolve17) => {
    const child = spawn4(bin, args, { ...cwd ? { cwd } : {}, windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => out += d);
    child.stderr.on("data", (d) => out += d);
    child.on("error", () => resolve17({ code: 127, out }));
    child.on("close", (code) => resolve17({ code: code ?? 1, out }));
  });
}
function resolveSpec(spec) {
  const trimmed = spec.trim();
  if (trimmed.startsWith(".") || trimmed.startsWith("/") || trimmed.startsWith("~")) {
    return { kind: "local", url: trimmed, name: path23.basename(trimmed.replace(/\/$/, "")) };
  }
  const shorthand = /^(?:github:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(trimmed);
  if (shorthand) {
    return {
      kind: "git",
      url: `https://github.com/${shorthand[1]}/${shorthand[2]}.git`,
      name: shorthand[2].toLowerCase()
    };
  }
  if (/^https?:\/\//.test(trimmed) || trimmed.startsWith("git@")) {
    const name = trimmed.replace(/\.git$/, "").split(/[/:]/).pop() ?? "pack";
    return { kind: "git", url: trimmed, name: name.toLowerCase() };
  }
  throw new Error(
    `Cannot work out where "${spec}" is. Use owner/repo, a URL, or a local path.`
  );
}
async function fetchPack(spec) {
  const resolved = resolveSpec(spec);
  if (resolved.kind === "local") {
    const dir2 = path23.resolve(resolved.url.replace(/^~/, os2.homedir()));
    await fs21.access(dir2);
    return { spec, dir: dir2, origin: dir2 };
  }
  const dir = await fs21.mkdtemp(path23.join(os2.tmpdir(), "contextmux-pack-"));
  const cloned = await run2("git", ["clone", "--depth", "1", "--quiet", resolved.url, dir]);
  if (cloned.code !== 0) {
    throw new Error(`Could not fetch ${resolved.url}: ${cloned.out.trim().split("\n").at(-1)}`);
  }
  const rev = await run2("git", ["rev-parse", "--short", "HEAD"], dir);
  return {
    spec,
    dir,
    origin: resolved.url,
    ...rev.code === 0 ? { commit: rev.out.trim() } : {}
  };
}
function report(pack) {
  heading(`${pack.name}`);
  bullet(`${pack.skills.length} skill(s) from ${pack.source.origin}`);
  if (pack.source.commit) bullet(`commit ${pack.source.commit}`);
  if (pack.license) bullet(`licence: ${pack.license}`);
  if (pack.instructions) {
    bullet(c.dim(`ships top-level guidance (${pack.instructions.length} chars) \u2014 not installed, see below`));
  }
}
async function addCommand(args) {
  const root = path23.resolve(flagString(args, "root") ?? process.cwd());
  const spec = args.positionals[0];
  const dryRun = flagBool(args, "dry-run", "n");
  const force = flagBool(args, "force", "f");
  if (!spec) {
    const installed = await installedPacks(root);
    if (installed.length === 0) {
      info("No packs installed.");
      info("");
      info("  ctxmux add github:DietrichGebert/ponytail   " + c.dim("minimal-code discipline"));
      info("  ctxmux add ./my-pack                        " + c.dim("a local directory"));
      return 0;
    }
    heading(`Installed packs (${installed.length})`);
    for (const pack2 of installed) {
      bullet(`${c.bold(pack2.name)} \u2014 ${pack2.skills.length} skill(s)${pack2.commit ? ` @ ${pack2.commit}` : ""}`);
      if (pack2.origin) info(`      ${c.dim(pack2.origin)}`);
      info(`      ${c.dim(pack2.skills.join(", "))}`);
    }
    return 0;
  }
  let source;
  try {
    source = await fetchPack(spec);
  } catch (err) {
    error(err.message);
    return 1;
  }
  const resolved = resolveSpec(spec);
  const pack = await readPack(source, flagString(args, "name") ?? resolved.name);
  if (pack.rejected.length > 0) {
    heading("Refused");
    for (const item of pack.rejected) bullet(`${item.from} \u2014 ${item.reason}`);
    info("    " + c.dim("A skill name becomes a directory, so it has to be a plain name."));
  }
  if (pack.skills.length === 0) {
    error(`No skills found in ${pack.source.origin}.`);
    info(
      "    " + c.dim("A pack needs skills/<name>/SKILL.md with a `description` in its frontmatter.")
    );
    return 1;
  }
  report(pack);
  const plan = await planInstall(root, pack, { force });
  heading(dryRun ? "Would install" : "Installing");
  for (const item of plan.install) {
    const tag = item.action === "create" ? c.green("new") : item.action === "update" ? c.yellow("update") : c.dim("ok");
    bullet(`${tag.padEnd(8)} ${item.skill.name}  ${c.dim(item.skill.description.slice(0, 60))}`);
  }
  if (plan.skipped.length > 0) {
    heading("Left alone");
    for (const item of plan.skipped) {
      bullet(`${item.name} \u2014 ${item.reason}`);
    }
    info("    " + c.dim("Use --force to replace them."));
  }
  if (!dryRun) {
    const written = await applyInstall(root, pack, plan);
    info("");
    if (written.length === 0) {
      success("Already up to date.");
    } else {
      success(`Installed ${written.length} skill(s) into .ctxmux/skills/.`);
    }
  }
  if (pack.instructions) {
    heading("Not installed");
    bullet("This pack ships repo-wide instructions as well as skills.");
    info(
      "    " + c.dim(
        "They were not merged into your instructions.md \u2014 that file is your project's own voice. Copy anything you want from it by hand."
      )
    );
  }
  info("");
  info("Next:");
  info(`  1. ${c.bold("ctxmux sync")}       ${c.dim("compile the new skills out to every agent")}`);
  info(`  2. ${c.bold("git diff")}        ${c.dim("review what was added \u2014 this is third-party content")}`);
  if (resolved.kind === "git") await fs21.rm(source.dir, { recursive: true, force: true });
  return 0;
}

// packages/cli/src/commands/handoff.ts
import { promises as fs22 } from "node:fs";
import * as path24 from "node:path";
async function loadTrajectory2(root, runId) {
  const file = path24.join(root, ".ctxmux/state/traces", `${encodeURIComponent(runId)}.json`);
  try {
    return Trajectory.from(JSON.parse(await fs22.readFile(file, "utf8")));
  } catch {
    return null;
  }
}
async function handoffCommand(args) {
  const root = path24.resolve(flagString(args, "root") ?? process.cwd());
  const target = args.positionals[0];
  const tier = flagString(args, "tier") ?? "valuable";
  const show = flagString(args, "render") !== void 0 || flagString(args, "tier") !== void 0;
  if (!target) {
    warn("Which run?");
    info("");
    info("  ctxmux handoff run-T-1              " + c.dim("what would be transferred"));
    info("  ctxmux handoff T-1 --tier essential " + c.dim("render at a tier"));
    return 1;
  }
  const store = new FileStore(path24.join(root, ".ctxmux", "state"));
  const run3 = await store.load(target) ?? await store.load(`run-${target}`);
  if (!run3) {
    error(`No run "${target}".`);
    return 1;
  }
  const trajectory = await loadTrajectory2(root, run3.id) ?? new Trajectory({ runId: run3.id, taskId: run3.task.id, agentId: "unknown", round: 0, startedAt: Date.now() });
  const pkg = buildHandoff({
    task: run3.task,
    trajectory,
    reason: run3.terminalReason ?? `run ended in "${run3.state}"`,
    fromAgentId: trajectory.meta.agentId,
    runId: run3.id,
    round: run3.feedbackRound,
    ...run3.result ? { result: run3.result } : {},
    gateOutcomes: run3.gateOutcomes
  });
  if (show) {
    info(renderHandoff(pkg, { tier }));
    return 0;
  }
  heading(`Handoff from ${pkg.from.agentId}`);
  bullet(pkg.reason);
  if (pkg.deadEnds.length > 0) {
    heading(`Already ruled out (${pkg.deadEnds.length})`);
    for (const end of pkg.deadEnds) {
      bullet(`${end.approach} \u2014 ${end.outcome}${end.attempts > 1 ? ` (${end.attempts}x)` : ""}`);
    }
  } else {
    heading("Already ruled out");
    info(c.dim("  nothing \u2014 the trajectory records no failed or repeated approach"));
  }
  if (pkg.failedChecks.length > 0) {
    heading("Still failing");
    for (const check2 of pkg.failedChecks) bullet(`${check2.gate}: ${check2.reason.split("\n")[0]}`);
  }
  heading("Work already done");
  bullet(pkg.progress.diffSummary);
  if (pkg.workspace.worktree) bullet(c.dim(pkg.workspace.worktree));
  heading("Cost by tier");
  for (const m of measureTiers(pkg)) {
    const label = m.tier === "none" ? "task only (control)" : m.tier === "essential" ? "task + workspace" : m.tier === "valuable" ? "+ what was ruled out" : "+ everything else";
    info(`  ${m.tier.padEnd(10)} ${String(m.tokens).padStart(5)} tokens  ${c.dim(label)}`);
  }
  info("");
  info(`  ${c.bold("ctxmux handoff " + target + " --tier valuable")}  ${c.dim("see the prompt itself")}`);
  info(`  ${c.dim("Run the same task at each tier with `ctxmux eval` to find out which parts earn their cost.")}`);
  success("");
  return 0;
}

// packages/cli/src/commands/state.ts
import { spawn as spawn5 } from "node:child_process";
import { promises as fs23 } from "node:fs";
import * as os3 from "node:os";
import * as path25 from "node:path";
var STATE_DIR = ".ctxmux/state";
var DEFAULT_BRANCH = "ctxmux-state";
function git4(cwd, args) {
  return new Promise((resolve17) => {
    const child = spawn5("git", args, { cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => stdout += d);
    child.stderr.on("data", (d) => stderr += d);
    child.on("error", (err) => resolve17({ code: 127, stdout, stderr: String(err) }));
    child.on("close", (code) => resolve17({ code: code ?? 1, stdout, stderr }));
  });
}
async function copyTree(from, to) {
  let copied = 0;
  const entries = await fs23.readdir(from, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const src = path25.join(from, entry.name);
    const dest = path25.join(to, entry.name);
    if (entry.isDirectory()) {
      await fs23.mkdir(dest, { recursive: true });
      copied += await copyTree(src, dest);
    } else if (entry.isFile()) {
      await fs23.mkdir(path25.dirname(dest), { recursive: true });
      await fs23.copyFile(src, dest);
      copied += 1;
    }
  }
  return copied;
}
function options(args) {
  return {
    root: path25.resolve(flagString(args, "root") ?? process.cwd()),
    branch: flagString(args, "branch") ?? DEFAULT_BRANCH,
    remote: flagString(args, "remote") ?? "origin"
  };
}
async function inStateWorktree(opts, fn) {
  const dir = await fs23.mkdtemp(path25.join(os3.tmpdir(), "ctxmux-state-"));
  await git4(opts.root, ["fetch", opts.remote, opts.branch, "--depth", "1"]).catch(() => {
  });
  const remoteHas = (await git4(opts.root, ["rev-parse", "--verify", `${opts.remote}/${opts.branch}`])).code === 0;
  const localHas = (await git4(opts.root, ["rev-parse", "--verify", opts.branch])).code === 0;
  const existed = remoteHas || localHas;
  const added = existed ? await git4(opts.root, ["worktree", "add", "--detach", dir, remoteHas ? `${opts.remote}/${opts.branch}` : opts.branch]) : await git4(opts.root, ["worktree", "add", "--detach", dir]);
  if (added.code !== 0) {
    await fs23.rm(dir, { recursive: true, force: true });
    throw new Error(`could not prepare a worktree for "${opts.branch}": ${added.stderr.trim()}`);
  }
  try {
    return await fn(dir, existed);
  } finally {
    await git4(opts.root, ["worktree", "remove", "--force", dir]).catch(() => {
    });
    await fs23.rm(dir, { recursive: true, force: true }).catch(() => {
    });
  }
}
async function statePushCommand(args) {
  const opts = options(args);
  const local = path25.join(opts.root, STATE_DIR);
  const files = await fs23.readdir(local).catch(() => null);
  if (files === null || files.length === 0) {
    warn("Nothing to push \u2014 no run state here yet.");
    info("    " + c.dim("State appears once a run has happened. Try `ctxmux run` first."));
    return 0;
  }
  return inStateWorktree(opts, async (dir, existed) => {
    if (!existed) await git4(dir, ["checkout", "--orphan", opts.branch]);
    else await git4(dir, ["checkout", "-B", opts.branch]);
    await fs23.rm(path25.join(dir, STATE_DIR), { recursive: true, force: true });
    await fs23.mkdir(path25.join(dir, STATE_DIR), { recursive: true });
    const copied = await copyTree(local, path25.join(dir, STATE_DIR));
    for (const entry of await fs23.readdir(dir)) {
      if (entry === ".git" || entry === ".ctxmux") continue;
      await fs23.rm(path25.join(dir, entry), { recursive: true, force: true });
    }
    await git4(dir, ["add", "-A"]);
    const status = await git4(dir, ["status", "--porcelain"]);
    if (!status.stdout.trim()) {
      success("Already up to date; nothing changed.");
      return 0;
    }
    const commit = await git4(dir, ["commit", "-m", `state: ${copied} file(s)`]);
    if (commit.code !== 0) {
      error(`Could not record the state: ${commit.stderr.trim()}`);
      return 1;
    }
    const pushed = await git4(dir, ["push", opts.remote, `HEAD:refs/heads/${opts.branch}`]);
    if (pushed.code !== 0) {
      error(`Could not push "${opts.branch}": ${pushed.stderr.trim()}`);
      info("    " + c.dim("The token needs write access to the repository for this to work."));
      return 1;
    }
    heading("Pushed");
    bullet(`${copied} file(s) to ${opts.remote}/${opts.branch}`);
    return 0;
  });
}
async function statePullCommand(args) {
  const opts = options(args);
  const local = path25.join(opts.root, STATE_DIR);
  return inStateWorktree(opts, async (dir, existed) => {
    if (!existed) {
      warn(`No "${opts.branch}" branch on ${opts.remote} yet.`);
      info("    " + c.dim("It appears the first time somebody runs `ctxmux state push`."));
      return 0;
    }
    const remote = path25.join(dir, STATE_DIR);
    if (!await fs23.readdir(remote).catch(() => null)) {
      warn(`"${opts.branch}" exists but carries no state.`);
      return 0;
    }
    await fs23.mkdir(local, { recursive: true });
    const copied = await copyTree(remote, local);
    heading("Pulled");
    bullet(`${copied} file(s) from ${opts.remote}/${opts.branch}`);
    info("");
    info(c.dim("  Merged into what was already here. `ctxmux status` shows the runs;"));
    info(c.dim("  `ctxmux learn` now sees everybody\u2019s observations, not only yours."));
    return 0;
  });
}

// packages/cli/src/index.ts
var HELP = `
${c.bold("ctxmux")} \u2014 one context source, every coding agent

${c.bold("USAGE")}
  ctxmux <command> [options]

${c.bold("COMMANDS")}
  run             Drive a task to a proposed change, with gates and an isolated worktree
  status          Show recorded runs and what is waiting on you
  trace           Show what an agent actually did, step by step
  handoff         Show what would be transferred to another agent, and what it costs
  event           Feed a forge webhook (a review, a comment) into a run
  eval            Run one task through several agents and compare the results
  learn           Turn recurring review feedback into proposed edits to .ctxmux/
  state           Share run state between machines and jobs (push | pull)

  init            Scaffold .ctxmux/ from a starter pack, using the detected toolchain
  import          Build .ctxmux/ from existing agent config already in the repo
  add             Install a third-party skill pack
  sync            Compile .ctxmux/ to every configured agent
  check           Verify generated files are in sync; exits non-zero if not (for CI)
  doctor          Report anything that will fail silently
  map             Query the repository index and print a token-budgeted map

${c.bold("COMMON OPTIONS")}
  --root <dir>        Repository root (default: cwd)
  --targets <list>    Comma-separated: claude,copilot,cursor,codex
  -n, --dry-run       Show what would happen without writing
  -f, --force         Overwrite hand-edited generated files
  --explain           Print the fidelity report: what each target loses
  -h, --help          Show this
  -v, --version       Show version

${c.bold("RUN OPTIONS")}
  --agent <name>      claude, cursor, codex, local (driven) or copilot (delegated)
  --agents <list>     Fallback chain: hand over when one gives up
  --handoff-tier <t>  How much to transfer: none|essential|valuable|optional
  --tracker <name>    file, github or jira
  --repo <owner/repo> Repository, for github and copilot
  --allow <globs>     Paths the agent may modify (comma-separated)
  --deny <globs>      Paths it must not modify
  --max-files <n>     Ceiling on files changed
  --max-rounds <n>    Self-correction rounds before escalating (default 2)
  --open-pr           Push the branch and open a pull request for what the agent produced
  --no-isolate        Work in your checkout instead of a git worktree
  --no-gates          Disable all gates (not recommended)
  --minimal           Add the minimalism gates: no unrequested dependencies, no
                      duplicate symbols, no speculative abstraction
  --no-recovery       Do not watch for stalls or record a trace
  --stall-after <n>   Samples with no progress before stopping (default 3)
  --otlp <url>        Send the trajectory to an OTLP collector (Jaeger, Grafana, SigNoz)
  --model <name>      Model for the agent

${c.bold("EVAL OPTIONS")}
  --agents <list>     Comma-separated, or "all"
  --out <file>        Write the comparison as markdown
  --concurrent        Run agents at once (distorts wall-clock figures)

${c.bold("EXAMPLES")}
  ctxmux run T-1 --allow "src/**"
  ctxmux run ABC-1234 --tracker jira --agent copilot
  ctxmux run T-1 --agents claude,codex        ${c.dim("# hand over if the first gives up")}
  ctxmux trace T-1 --otlp-json                ${c.dim("# the OTLP payload, to pipe anywhere")}
  ctxmux run "add a currency formatter" --dry-run
  ctxmux eval T-1 --agents claude,cursor,codex --out comparison.md
  ctxmux learn                        ${c.dim("# what has recurred across runs")}
  ctxmux status
  ctxmux import && ctxmux sync --explain
  ctxmux check --strict                       ${c.dim("# in CI")}
  ctxmux map "add a currency formatter" --budget 3000
  ctxmux sync --targets claude,cursor
`;
var VERSION2 = true ? "0.2.0" : "0.0.0-dev";
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (flagBool(args, "version", "v")) {
    info(VERSION2);
    return 0;
  }
  if (!args.command || flagBool(args, "help", "h")) {
    info(HELP.trim());
    return args.command ? 0 : 1;
  }
  switch (args.command) {
    case "init":
      return initCommand(args);
    case "import":
      return importCommand(args);
    case "sync":
      return syncCommand(args);
    case "check":
      return checkCommand(args);
    case "doctor":
      return doctorCommand(args);
    case "map":
      return mapCommand(args);
    case "run":
      return runCommand(args);
    case "status":
      return statusCommand(args);
    case "event":
      return eventCommand(args);
    case "eval":
      return evalCommand(args);
    case "learn":
      return learnCommand(args);
    case "trace":
      return traceCommand(args);
    case "add":
      return addCommand(args);
    case "handoff":
      return handoffCommand(args);
    case "state": {
      const verb = args.positionals[0];
      if (verb === "push") return statePushCommand(args);
      if (verb === "pull") return statePullCommand(args);
      error(`Usage: ctxmux state <push|pull>${verb ? ` \u2014 not "${verb}"` : ""}`);
      return 1;
    }
    default:
      error(`Unknown command: ${args.command}`);
      info("");
      info(HELP.trim());
      return 1;
  }
}
main().then((code) => {
  process.exitCode = code;
}).catch((err) => {
  if (err instanceof UsageError) {
    error(err.message);
    if (err.hint) info("    " + c.dim(err.hint));
    process.exitCode = 2;
    return;
  }
  try {
    process.exitCode = reportContextError(err);
  } catch {
    error(err.message);
    if (process.env["CTXMUX_DEBUG"]) console.error(err);
    else info(c.dim("Set CTXMUX_DEBUG=1 for a stack trace."));
    process.exitCode = 1;
  }
});
