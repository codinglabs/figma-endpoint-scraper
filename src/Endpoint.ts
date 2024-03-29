import * as jsonPath from "jsonpath"

type EndpointAttribute = [string, string]
type FieldValueType = Array<string> | Array<Uint8Array> | undefined
type DataStore = {
    lastParams?: Array<[string, string]>,
    data: StoreDataTypes
}

type StoreDataTypes = Object;
type ParameterType = Array<[string, string]>

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

class Endpoint {
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
            if (this._storeCache) {
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
        let url = this.endpoint;

        if (this.apiBase) {
            url = this.apiBase+url;
        }
        
        param.forEach(element => {
            url = replaceAll(url, "%"+element[0], element[1])
        });

        return url.toString();
    }
}

export default Endpoint;
export {EndpointAttribute, FieldValueType, ParameterType}