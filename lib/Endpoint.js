var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as jsonPath from "jsonpath";
const isValidURL = (url) => {
    try {
        new URL(url);
    }
    catch (e) {
        return false;
    }
    return true;
};
const isImageResourceURL = (url) => {
    if (isValidURL(url)) {
        const supportedExtensions = [".jpg", ".jpeg", ".png"];
        const catchedExtension = supportedExtensions.map(ext => url.endsWith(ext));
        return catchedExtension.includes(true);
    }
    return false;
};
const replaceAll = (str, find, replace) => {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
};
const escapeRegExp = (string) => {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
};
class Endpoint {
    constructor(title, endpoint, defaultParameters, attributes, basePath) {
        this.querryField = (attribute, param) => __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.store(param)
                    .then(store => this.filterStoreForField(store, attribute[1]))
                    .then(results => this.sanitizeValue(results))
                    .then(values => resolve(values))
                    .catch(e => reject(e));
            });
        });
        this.queryFieldByAttributeName = (name, param) => {
            const attribute = this.attributes.find(attr => attr[0] === name);
            console.log(name);
            if (attribute) {
                return this.querryField(attribute, param);
            }
            return Promise.reject("Couldn't find attribute with name: " + name);
        };
        this.filterStoreForField = (store, path) => {
            return new Promise((resolve, reject) => {
                const result = jsonPath.query(store, path);
                if (result != null && result !== undefined && result.length > 0) {
                    resolve(result);
                }
                else {
                    reject("Invalid Path: " + path);
                }
            });
        };
        this.sanitizeValue = (values) => {
            return new Promise((allResolve, allRejected) => {
                const promises = values.map(rawValue => {
                    const value = String(rawValue);
                    if (isImageResourceURL(value)) {
                        console.log("Image URL", value);
                        return this.fetchImage(value);
                    }
                    else {
                        return Promise.resolve(value);
                    }
                });
                let finalAvailableValues = [];
                const settled = Promise.allSettled(promises)
                    .then((results) => results.forEach(result => {
                    if (result.status === "fulfilled") {
                        finalAvailableValues.push(result.value);
                    }
                }))
                    .finally(() => {
                    allResolve(finalAvailableValues);
                })
                    .catch(e => allRejected(e));
            });
        };
        this.fetchImage = (url) => {
            return new Promise((resolve, reject) => {
                fetch(url)
                    .then(response => response.arrayBuffer())
                    .then(data => resolve(new Uint8Array(data)))
                    .catch(e => reject(e));
            });
        };
        this.store = (param) => {
            return new Promise((resolve, reject) => {
                if (this._storeCache) {
                    if (param && this._storeCache && param == this._storeCache.lastParams) {
                        resolve(this._storeCache.data);
                    }
                    else {
                        this.querryStore(param)
                            .then(s => resolve(s.data))
                            .catch(r => reject(r));
                    }
                }
                else {
                    this.querryStore(param)
                        .then(s => resolve(s.data))
                        .catch(r => reject(r));
                }
            });
        };
        this.querryStore = (param) => {
            return new Promise((resolve, reject) => {
                fetch(this.endpointPathWithParameter(param), {
                    headers: {
                        "Visitor-Id": "FIGMA-PLUGIN",
                    }
                })
                    .then(response => response.json())
                    .then(data => {
                    const newStore = {
                        lastParams: param,
                        data: this.basePath ? data[this.basePath] : data
                    };
                    this._storeCache = newStore;
                    resolve(this._storeCache);
                })
                    .catch(r => reject(r));
            });
        };
        this.endpointPathWithParameter = (param = []) => {
            let url = this.endpoint;
            if (this.apiBase) {
                url = this.apiBase + url;
            }
            param.forEach(element => {
                url = replaceAll(url, "%" + element[0], element[1]);
            });
            return url.toString();
        };
        this.title = title;
        this.endpoint = endpoint;
        this.attributes = attributes;
        this.basePath = basePath;
        this.defaultParameter = defaultParameters;
    }
}
export default Endpoint;
