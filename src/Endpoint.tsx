import * as jsonPath from "jsonpath"

type EndpointAttribute = [string, string]
type FieldValueType = String | Array<String> | Uint8Array | Uint8Array[] | undefined
type DataStore = {
    lastParams?: Array<[string, string]>,
    data: StoreDataTypes
}

type StoreDataTypes = Object;
type ParameterType = Array<[string, string]>

const API_BASE = ""

const isValidURL = (url: string): boolean => {
    try {
        new URL(this);
    } catch (e) {
        return false;
    }

    return true;
} 

const isImageResourceURL = (url: string) => {
    if (isValidURL(url)) {
        const supportedExtensions = ["jpg", "jpeg", "png"];
        const catchedExtension = supportedExtensions.map(ext => url.endsWith(ext));

        return catchedExtension.includes(true);
    } 
    
    return false;
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

    sanitizeValue = (value: any[]): Promise<FieldValueType> => {
        return new Promise((resolve, reject) => {
            if (typeof(value) == "string"){
                const stringValue = value as string;
    
                if (isImageResourceURL(stringValue)) {
                    this.fetchImage(stringValue)
                        .then(image => resolve(image))
                        .catch(e => reject(e));
                } else {
                    resolve(stringValue);
                }
            } else if (typeof(value) == "number") {
                resolve(String(value));
            }
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
                if (param && param == this._storeCache.lastParams) {
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
        let url = new URL(API_BASE+this.endpoint);
        
        param.forEach(element => {
            url.searchParams.set("%"+element[0], element[1])
        });

        return url.toString();
    }
}

export default Endpoint;