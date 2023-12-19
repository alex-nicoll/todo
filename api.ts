/**
 * callApi is feeds the result of {@link callApiNoParse} into {@link parseJson}.
 * If any error is encountered, it returns "failed".
 */
export async function callApi(apiUrl: string, operation: string, args?: object) {
  const resp = await callApiNoParse(apiUrl, operation, args);
  if (resp === "failed") {
    return "failed";
  }
  return parseJson(resp);
}

/**
 * callApiNoParse initiates a POST request to apiUrl. The request body is the
 * JSON encoding of args with operation merged in. callApiNoParse checks the
 * status code. If an error is encountered, it returns "failed". Otherwise, it
 * returns the {@link Response}.
 */
export async function callApiNoParse(apiUrl: string, operation: string, args?: object) {
  const options = {
    method: "POST",
    body: JSON.stringify({ operation, ...args })
  };
  console.log(options);
  let resp;
  try {
    resp = await fetch(apiUrl, options);
  } catch (e) {
    console.error(e);
    return "failed";
  }
  if (resp.status !== 200) {
    return "failed";
  }
  return resp;
}

/**
 * parseJson parses a {@link Response} body as JSON. If there is no JSON to
 * parse, or any other error is encountered, it returns "failed". Otherwise, it
 * returns the parsed response body.
 * 
 * To determine whether the response contains JSON before parsing it, call
 * {@link containsJson}.
 */
export async function parseJson(resp: Response) {
  let v;
  try {
    v = await resp.json();
  } catch (e) {
    console.error(e)
    return "failed";
  }
  console.log(v);
  return v;
}

/**
 * containsJson checks whether the given {@link Response} contains JSON. 
 */
export function containsJson(resp: Response) {
  const contentType = resp.headers.get("content-type");
  console.log("contentType " + contentType);
  if (contentType === null || contentType.indexOf("application/json") === -1) {
    return false;
  }
  return true;
}