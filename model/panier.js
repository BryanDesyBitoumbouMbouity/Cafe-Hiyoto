import connectionPromise from '../connexion.js';

/**
 * Retourne une liste de tous les produits, leur quantite et leur total dans 
 * le panier dans la base de données.
 * @returns Une liste de tous les produits, leur quantite et leur total.
 */
export const getPanier = async (utilisateur) => {
    let connection = await connectionPromise;
    
    let results = await connection.all(
        `SELECT commande_produit.id_produit, nom, chemin_image, printf("%.2f", prix) AS prix,
            quantite, printf("%.2f", prix * quantite) AS total
        FROM commande_produit 
        INNER JOIN produit ON commande_produit.id_produit = produit.id_produit
        INNER JOIN commande ON commande_produit.id_commande = commande.id_commande
        WHERE id_etat_commande = 1
              And commande.id_utilisateur = ?;`,
              [utilisateur]
    );
    
    return results;
}

/**
 * Ajoute un produit dans le panier dans la base de données.
 * @param {Number} idProduit L'identifiant du produit à ajouter.
 * @param {Number} quantite La quantité du produit à ajouter.
 * @param {Number} utilisateur Le id du utlisateur.
 */
export const addToPanier = async (idProduit, quantite, utilisateur) => {
    let connection = await connectionPromise;

    // On regarde si la commande du panier existe de l'utilisateur actuelle
    let commandePanier = await connection.get(
        `SELECT id_commande 
        FROM commande 
        WHERE id_etat_commande = 1
              and id_utilisateur =?;`,
              [utilisateur]
    );
    // On ajoute la commande du panier si elle n'existe pas
    let idCommande;
    if(!commandePanier) {
        let result = await connection.run(
            `INSERT INTO commande(id_utilisateur, id_etat_commande)
            VALUES(?, 1);`,
            [utilisateur]
            
        );

        idCommande = result.lastID;
    }
    else {
        idCommande = commandePanier.id_commande;
    }
    // On recherche si le produit en paramètre existe déjà dans notre panier
    let entreePanier = await connection.get(
        `SELECT quantite 
        FROM commande_produit 
        INNER JOIN commande ON commande_produit.id_commande = commande.id_commande
        WHERE id_etat_commande = 1 AND id_produit = ?
              and commande.id_commande = ? and commande_produit.id_utilisateur=?;`,
        [idProduit, idCommande, utilisateur]
    );
   
    if (entreePanier) {
        // Si le produit existe déjà dans le panier, on incrémente sa quantité
        await connection.run(
            `UPDATE commande_produit 
            SET quantite = ?
            FROM commande
            WHERE 
            commande_produit.id_commande = commande.id_commande and
                id_etat_commande = 1 AND 
                id_produit = ?
                and commande.id_commande=?
                and commande_produit.id_utilisateur=?;`,
            [quantite + entreePanier.quantite, idProduit, idCommande, utilisateur]
        );

    }
    else {
        // Si le produit n'existe pas dans le panier, on l'insère dedans
        
        await connection.run(
            `INSERT INTO commande_produit(id_commande, id_produit, quantite, id_utilisateur)
            VALUES(?, ?, ?, ?);`,
            [idCommande, idProduit, quantite, utilisateur]
        );
    }
}

/**
 * Retire un produit du panier dans la base de données.
 * @param {Number} idProduit L'identifiant du produit à retirer.
 * @param {Number} utilisateur L'identifiant du produit à retirer.
 */
export const removeFromPanier = async (idProduit, utilisateur) => {
    let connection = await connectionPromise;

    await connection.run(
        `DELETE FROM commande_produit
        WHERE 
            id_commande = (
                SELECT id_commande and id_utilisateur = ?
                FROM commande 
                WHERE id_etat_commande = 1 
            ) AND
            id_produit = ?;`,
        [utilisateur, idProduit]
    );
}

/**
 * Vide le panier dans la base de données
 * @param {Number} utilisateur Le id du utlisateur.
 */
export const emptyPanier = async (utilisateur) => {
    let connection = await connectionPromise;

    await connection.run(
        `DELETE FROM commande_produit
        WHERE id_commande = (
            SELECT id_commande and id_utilisateur =? 
            FROM commande 
            WHERE id_etat_commande = 1
        );`,
        [utilisateur]
    );
}