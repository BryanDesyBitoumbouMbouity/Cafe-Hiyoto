const formLog =document.getElementById('form-login');
const inputCourriel = document.getElementById("input-courriel");
const inputMotPasse = document.getElementById("input-mot-de-passe");
const formErreur = document.getElementById('form-erreur')

//fonction pour login
async function Login(event){
    event.preventDefault();

    //insert info dans data pour etre mis dans response
    let data = {
        courriel: inputCourriel.value,
        motPasse: inputMotPasse.value
    }

    //appel route connection
    let response = await fetch('/connexion', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    //ramaine a la page du menu
    if(response.ok){
        location.replace('/');
    }
    else if(response.status === 401){
        //montre les erreur au client si a lieu
        let info = await response.json();
       
        if(info.erreur === 'mauvais_utilisatuer'){
            formErreur.innerText = 'Le courriel n\'existe pas'
        }
        else if(info.erreur === 'mauvais_mot_de_passe'){
            formErreur.innerText = 'Mauvais mot de passe'
        }
    }
    
}

formLog.addEventListener('submit', Login)