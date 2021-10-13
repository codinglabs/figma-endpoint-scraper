declare type EndpointAttribute = [string, string];
declare type FieldValueType = Array<string> | Array<Uint8Array> | undefined;
declare type DataStore = {
    lastParams?: Array<[string, string]>;
    data: StoreDataTypes;
};
declare type StoreDataTypes = Object;
declare type ParameterType = Array<[string, string]>;
declare class Endpoint {
    _storeCache?: DataStore;
    title: string;
    endpoint: string;
    defaultParameter: ParameterType;
    basePath?: string;
    apiBase?: string;
    attributes: Array<EndpointAttribute>;
    constructor(title: string, endpoint: string, defaultParameters: ParameterType, attributes: Array<EndpointAttribute>, basePath?: string);
    querryField: (attribute: EndpointAttribute, param?: ParameterType) => Promise<FieldValueType>;
    queryFieldByAttributeName: (name: string, param?: ParameterType) => Promise<FieldValueType>;
    filterStoreForField: (store: StoreDataTypes, path: string) => Promise<any[]>;
    sanitizeValue: (values: any[]) => Promise<FieldValueType>;
    fetchImage: (url: string) => Promise<Uint8Array>;
    store: (param?: ParameterType) => Promise<StoreDataTypes>;
    querryStore: (param?: ParameterType) => Promise<DataStore>;
    endpointPathWithParameter: (param?: ParameterType) => string;
}
export default Endpoint;
export { EndpointAttribute, FieldValueType, ParameterType };
