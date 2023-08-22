

var TokenScopes = class {
    static requiredScopes = ['repo', 'user', 'workflow'];
    
    constructor(scopes) {
        this.scopes = scopes;
    }

    missingScopes = () => TokenScopes.requiredScopes.filter(e => !this.scopes.includes(e));

    toString = () => this.scopes;
}
