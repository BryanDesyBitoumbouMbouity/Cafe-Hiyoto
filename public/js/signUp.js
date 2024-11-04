const formAuth =document.getElementById('form-signUp');
const inputPrenom = document.getElementById('input-prenom');
const inputNom = document.getElementById('input-nom');
const inputCourriel = document.getElementById("input-courriel");
const inputMotPasse = document.getElementById("input-mot-de-passe");
const formErreur = document.getElementById('form-erreur')

//fonction pour s'incrire
async function SignUp(event){
    event.preventDefault();

    //inserer info dans data pour etre mis dans le response
    let data = {
        courriel: inputCourriel.value,
        motPasse: inputMotPasse.value,
        prenom: inputPrenom.value,
        nom: inputNom.value
    }

    let response = await fetch('/inscription', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
//deplace vers la page login
    if(response.ok){
        location.replace('/login');
    }
    else if(response.status === 409){
        formErreur.innerText =='Le courriel existe deja'
    }
}
//ecoute pour l'evenement submit
formAuth.addEventListener('submit', SignUp)