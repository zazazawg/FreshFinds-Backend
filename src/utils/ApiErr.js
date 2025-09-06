class ApiErr extends Error {
    constructor(message, status = 500, errors = [], stack = "") {
        super(message);  

        this.status = status;
        this.errors = errors;
        this.data = null;
         
        if (stack) {
            this.stack = stack;  
        } else {
            Error.captureStackTrace(this, this.constructor); 
        }
    }
}

export default ApiErr;
