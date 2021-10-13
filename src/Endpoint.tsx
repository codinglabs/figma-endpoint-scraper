// This script is from https://github.com/codinglabs/figma-endpoint-scraper 
// It's published freely under the MIT license
// MIT License

// Copyright (c) 2021 Philipp Steinacher

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as jsonPath from "jsonpath"

export type EndpointAttribute = [string, string]
export type FieldValueType = Array<string> | Array<Uint8Array> | undefined
type DataStore = {
    lastParams?: Array<[string, string]>,
    data: StoreDataTypes
}

type StoreDataTypes = Object;
export type ParameterType = Array<[string, string]>

const API_BASE = "";

const isValidURL = (url: string): boolean => {
    try {
        new URL(url);
    } catch (e) {
        return false;
    }

    return true;
} 

const isImageResourceURL = (url: string) => {
    if (isValidURL(url)) {
        const supportedExtensions = [".jpg", ".jpeg", ".png"];
        const catchedExtension = supportedExtensions.map(ext => url.endsWith(ext));

        return catchedExtension.includes(true);
    } 
    
    return false;
}

const replaceAll = (str: string, find: string, replace: string) => {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

const escapeRegExp = (string: string) => {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

export class Endpoint {
    _storeCache?: DataStore;
    title: string;
    endpoint: string;
    defaultParameter: ParameterType;
    basePath?: string;
    apiBase?: string;
    attributes: Array<EndpointAttribute>;

    constructor (title: string, endpoint: string, defaultParameters: ParameterType, attributes: Array<EndpointAttribute>, basePath?: string) {
        this.title = title;
        this.endpoint = endpoint;
        this.attributes = attributes;
        this.basePath = basePath;
        this.defaultParameter = defaultParameters;
    }

    querryField = async (attribute: EndpointAttribute, param?: ParameterType): Promise<FieldValueType> => {
        return new Promise ((resolve, reject) => {
            this.store(param)
                .then(store => this.filterStoreForField(store, attribute[1]))
                .then(results => this.sanitizeValue(results))
                .then(values => resolve(values))
                .catch(e => reject(e));
        });
    }

    queryFieldByAttributeName =(name: string, param?: ParameterType): Promise<FieldValueType> => {
        const attribute = this.attributes.find(attr => attr[0] === name);
        console.log(name)
        if(attribute) {
            return this.querryField(attribute, param);
        }

        return Promise.reject("Couldn't find attribute with name: "+name)
    }

    filterStoreForField = (store: StoreDataTypes, path: string): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const result = jsonPath.query(store, path);

            if (result != null && result !== undefined && result.length > 0) {
                resolve(result);
            } else {
                reject("Invalid Path: "+ path);
            }
        })
    }

    sanitizeValue = (values: any[]): Promise<FieldValueType> => {
        return new Promise((allResolve, allRejected) => {
            const promises = values.map(rawValue => {
                const value = String(rawValue);
    
                if(isImageResourceURL(value)) {
                    console.log("Image URL", value)
                    return this.fetchImage(value);
                } else {
                    return Promise.resolve(value)
                }
            })

            let finalAvailableValues: Array<string | Uint8Array> = [];

            const settled = Promise.allSettled(promises)
                .then((results) => results.forEach(result => {
                    if(result.status === "fulfilled") {
                        finalAvailableValues.push(result.value)
                    }
                }))
                .finally(() => {
                    allResolve(finalAvailableValues as FieldValueType)
                })
                .catch(e => allRejected(e));
        })
    }

    fetchImage = (url: string): Promise<Uint8Array> => {
        return new Promise<Uint8Array>((resolve, reject) => {
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(data => resolve(new Uint8Array(data)))
                .catch(e => reject(e))
        });
    }

    store = (param?: ParameterType): Promise<StoreDataTypes> => {
        return new Promise((resolve, reject) => {
            if (this.store) {
                if (param && this._storeCache && param == this._storeCache.lastParams) {
                    resolve(this._storeCache.data)
                } else {
                    this.querryStore(param)
                        .then(s => resolve(s.data))
                        .catch(r => reject(r));
                }
            } else {
                this.querryStore(param)
                        .then(s => resolve(s.data))
                        .catch(r => reject(r));
            }
        })
    }

    querryStore = (param?: ParameterType): Promise<DataStore> => {
        return new Promise<DataStore> ((resolve, reject) => {
            fetch (this.endpointPathWithParameter(param), 
                {
                    headers: {
                        "Visitor-Id": "FIGMA-PLUGIN",
                    }
                }
            )
            .then(response => response.json())
            .then(data => {
                const newStore: DataStore = {
                    lastParams: param,
                    data: this.basePath ? data[this.basePath] : data
                }

                this._storeCache = newStore;
                resolve(this._storeCache)
            })
            .catch(r => reject(r));
        })
    }

    endpointPathWithParameter = (param: ParameterType = []): string => {
        let url = API_BASE+this.endpoint;
        
        param.forEach(element => {
            url = replaceAll(url, "%"+element[0], element[1])
        });

        return url.toString();
    }
}

export default Endpoint;