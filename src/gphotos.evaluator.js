module.exports = {
  albumData: () => {
    const url = window.location.href;
    const name = document.title.replace(' - Google Photos', '');
    const parts = url.match(/\/share\/(.*)\?key=(.*)/);
    return {
      id: parts[1],
      key: parts[2],
      name,
      url,
    };
  },

  getPhotoList: async () => {
    const lista = [];

    const sleep = async (ms) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    };

    return new Promise(async (resolve) => {
      // La paginación de datos se hace automaticamente,
      // por lo que debemos interceptar las llamadas XHR
      const origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (
        method,
        url,
        async,
        user,
        password
      ) {
        if (url.match(/batchexecute/)) {
          this.addEventListener('load', function () {
            let data = this.responseText.split('\n');
            data = JSON.parse(`${data[3].substring(1)}`);
            data = JSON.parse(data[2]);
            data = data[1];

            lista.push(
              ...[...data].map((item) => {
                return {
                  id: item[0],
                  url: item[1][0],
                };
              })
            );
          });
        }
        origOpen.apply(this, arguments);
      };

      // La primera pagina de datos se obtiene desde un script renderizado en el body.
      const scripts = document.querySelectorAll('script[nonce]');
      scripts.forEach((script) => {
        if (script.innerText.startsWith('AF_initDataCallback')) {
          let str = script.innerText.substring(20, script.innerText.length - 2);
          let jsonObj = null;
          eval(`jsonObj = ${str}`);
          if (jsonObj) {
            lista.push(
              ...jsonObj.data[1].map((item) => {
                return {
                  id: item[0],
                  url: item[1][0],
                };
              })
            );
          }
        }
      });

      // Cuando detectemos que no se hayan cargado mas elementos a la lista, debemos resolver la promesa
      let last = lista.length;
      let retries = 0;
      while (retries < 5) {
        if (lista.length !== last) {
          last = lista.length;
          retries = 0;
        }
        retries++;
        await sleep(1000);
      }

      resolve(lista);
    });
  },
};
