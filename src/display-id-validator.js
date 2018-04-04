const validationHost = "https://www.googleapis.com";
const validationPath = "/storage/v1/b/risevision-display-notifications/o/DISPLAYID%2Fcontent.json";
const validationParams = "?fields=size";
const validationUrl = `${validationHost}${validationPath}${validationParams}`;

module.exports = (id) => {
  return fetch(validationUrl.replace('DISPLAYID', id.toUpperCase().trim()))
  .then(response => response.json())
  .then((json)=>{
    if (json.error) {return Promise.reject(Error(json.error.message));}
    if (json.size === '2') {return Promise.reject(Error('Display has been deleted'));}
    return json;
  });
}
