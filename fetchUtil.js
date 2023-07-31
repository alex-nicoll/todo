// fetchObject calls fetch with apiUrl and the given options, checks the status
// code, and parses the response body as JSON. If an error is encountered, it
// returns "failed". Otherwise, it returns the parsed response body.
export async function fetchObject(apiUrl, options) {
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

// newPost constructs options to pass to fetchObject sufficient to initiate a
// POST request. The request body is the JSON encoding of args with operation
// merged in.
export function newPost(operation, args) {
  return {
    method: "POST",
    body: JSON.stringify({ operation, ...args })
  };
}
