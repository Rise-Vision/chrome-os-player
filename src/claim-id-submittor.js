const coreUrl = 'https://rvaserver2.appspot.com';
const claimUrl = `${coreUrl}/v2/viewer/display`;

module.exports = (id, name) => {
  if (!id) {return Promise.reject(Error("Missing id"));}
  if (!name) {return Promise.reject(Error("Missing display name"));}

  return fetch(`${claimUrl}/${id}/register?name=${name}`)
  .then(response => response.json())
  .then((json)=>{
    if (!json || !json.status) {return Promise.reject(Error("Unexpected error"));}
    if (json.status.code !== 0) {return Promise.reject(Error(json.status.message));}

    return json.displayId;
  });
};
