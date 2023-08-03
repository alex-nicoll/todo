// callApi initiates a POST request to apiUrl. The request body is the JSON
// encoding of args with operation merged in. callApi checks the status code
// and parses the response body as JSON. If an error is encountered, it returns
// "failed". Otherwise, it returns the parsed response body.
export async function callApi(apiUrl, operation, args) {
  let resp;
  try {
    const options = {
      method: "POST",
      body: JSON.stringify({ operation, ...args })
    };
    console.log(options);
    resp = await fetch(apiUrl, options);
  } catch (e) {
    console.error(e);
    return "failed";
  }
  if (resp.status !== 200) {
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
