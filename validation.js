import { getPanier } from "./model/panier.js";
import connectionPromise from "./connexion.js";
import { request } from "express";

/**
 * Valide un identifiant (ID) reçu par le serveur.
 * @param {*} id L'identifiant à valider.
 * @returns Une valeur booléenne indiquant si l'identifiant est valide ou non.
 */
export const validateId = (id) => {
    return !!id &&
        typeof id === 'number' &&
        Number.isInteger(id) &&
        id > 0;
}

/**
 * Valide le panier dans la base de données du serveur.
 * @returns Une valeur booléenne indiquant si le panier est valide ou non.
 */
export const validatePanier = async (utilisateur) => {
    let panier = await getPanier(utilisateur);
    return panier.length > 0;
}

//Valide le courriel dans la base de données du serveur qu'il soit conform avec @ dans le milieu et finir avec .com ou .ca
export const isCourrielValid = (courriel) =>
typeof courriel === 'string' && 
courriel.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.([c][o][m]|[c][a])$/);

//Valide le mot de passe dans la base de données du serveur
export const isMotPasseValid = (motPasse) =>
typeof motPasse === 'string' &&
motPasse.length >= 8; 

//Valide le nom dans la base de données du serveur
export const isNomValid = (nom) =>
typeof nom === 'string' &&
nom.length >= 3;

//Valide le prenom dans la base de données du serveur
export const isPrenomValid = (prenom) =>
typeof prenom === 'string' &&
prenom.length >= 3;

//Valide si le courriel est unique dans la base de données du serveur
export const isCourrielUnique = async (courriel) => {
    let connection = await connectionPromise;
    
    let results = await connection.all(
        `SELECT COUNT(*) AS count FROM utilisateur WHERE courriel = ?`,
         [courriel]
    );
    
    if(results === 1){
        return false;
    }

    return results;
}

