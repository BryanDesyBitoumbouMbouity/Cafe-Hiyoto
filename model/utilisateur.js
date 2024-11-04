import  connectionPromise from "../connexion.js";
import bcrypt from 'bcrypt'

//fonction cree utilisateur
export async function addUtilisateur(courriel, motPasse, prenom, nom){
    const connection = await connectionPromise;
//creation du hash
    let hash = await bcrypt.hash(motPasse, 10);

//insert dans le tableau utilisateur
    await connection.run(
        `INSERT INTO utilisateur(id_type_utilisateur, courriel, mot_de_passe, prenom, nom)
        VALUES(1,?,?,?,?)`,
        [courriel, hash, prenom, nom]
    )
}

export async function getUtilisateurParId(idUtilisateur){
    const connection = await connectionPromise;
//selection l'utilisateur par id 
    let utilisateur = await connection.get(
        `SELECT  * 
        FROM utilisateur
        WHERE id_utilisateur = ?`,
        [idUtilisateur]
    );

    return utilisateur;
}

export async function getUtilisateurParCourriel(courriel){
 const connection = await connectionPromise;
    //selection l'utilisateur par courriel
    let utilisateur = await connection.get(
        `SELECT  * 
        FROM utilisateur
        WHERE courriel = ?`,
        [courriel]
    );

    return utilisateur;
}