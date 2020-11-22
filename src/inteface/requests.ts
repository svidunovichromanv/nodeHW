export interface PostmanRequest {
    id: string;
    name: string;
    url: string;
    method: 'GET' | 'POST' | 'DELETE' | 'PUT';
    params: string;
    contentType: 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'GraphQL';
    body?: any;
    headers: KeyValue[];
}
export interface KeyValue {
    key: string;
    value: string | number;
}
