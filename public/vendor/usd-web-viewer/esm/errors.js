/** Why a load failed: `aborted`, `fetch` (root layer or a resource limit), `compose`, `worker` or `webgl`. */
export class UsdLoadError extends Error {
    name = "UsdLoadError";
    code;
    constructor(code, message, { url, status, cause } = {}) {
        super(message, cause === undefined ? undefined : { cause });
        this.code = code;
        if (url !== undefined) {
            this.url = url;
        }
        if (status !== undefined) {
            this.status = status;
        }
    }
}
