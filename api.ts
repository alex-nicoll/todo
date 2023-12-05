/**
 * callApi initiates a POST request to apiUrl. The request body is the JSON
 * encoding of args with operation merged in. callApi checks the status code
 * and parses the response body as JSON. If an error is encountered, it returns
 * "failed". Otherwise, it returns the parsed response body.
 */
export async function callApi(apiUrl: string, operation: string, args?: object) {
  const resp = await callApiNoParse(apiUrl, operation, args);
  if (resp === "failed") {
    return "failed";
  }
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
 * callApiNoParse is like {@link callApi}, except it doesn't try to parse the response
 * body as JSON. If no error is encountered, it returns a Response object.
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
