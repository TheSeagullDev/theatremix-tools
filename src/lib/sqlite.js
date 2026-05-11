import initSqlJs from "sql.js";

let SQLPromise = null;

export function getSQL() {
    if (!SQLPromise) {
        SQLPromise = initSqlJs({
            locateFile: (file) => "/sql-wasm.wasm"
        });
    }
    return SQLPromise;
}