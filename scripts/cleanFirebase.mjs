/**
 * Script para limpar dados do Firebase
 * Requer configuração do Firebase Admin SDK
 * 
 * Execute: node scripts/cleanFirebase.mjs
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Você precisa baixar a chave de serviço do Firebase Console:
// 1. Acesse: https://console.firebase.google.com/project/clinikondo/settings/serviceaccounts/adminsdk
// 2. Clique em "Generate new private key"
// 3. Salve como: scripts/serviceAccountKey.json

import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'sclinikondo.firebasestorage.app'
});

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

async function deleteAllUsers() {
  console.log('🔄 Deletando usuários...');
  
  let nextPageToken;
  let deletedCount = 0;
  
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    
    if (listUsersResult.users.length === 0) {
      console.log('  Nenhum usuário encontrado.');
      break;
    }
    
    const uids = listUsersResult.users.map(user => user.uid);
    await auth.deleteUsers(uids);
    deletedCount += uids.length;
    
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  
  console.log(`✅ ${deletedCount} usuário(s) deletado(s).`);
}

async function deleteAllCollections() {
  console.log('🔄 Deletando coleções do Firestore...');
  
  const collections = await db.listCollections();
  
  if (collections.length === 0) {
    console.log('  Nenhuma coleção encontrada.');
    return;
  }
  
  for (const collection of collections) {
    console.log(`  Deletando coleção: ${collection.id}`);
    await deleteCollection(collection);
  }
  
  console.log('✅ Firestore limpo.');
}

async function deleteCollection(collectionRef) {
  const snapshot = await collectionRef.get();
  
  const batchSize = 500;
  const batches = [];
  let batch = db.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    
    if (count >= batchSize) {
      batches.push(batch.commit());
      batch = db.batch();
      count = 0;
    }
  }
  
  if (count > 0) {
    batches.push(batch.commit());
  }
  
  await Promise.all(batches);
}

async function deleteAllStorageFiles() {
  console.log('🔄 Deletando arquivos do Storage...');
  
  try {
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles();
    
    if (files.length === 0) {
      console.log('  Nenhum arquivo encontrado.');
      return;
    }
    
    for (const file of files) {
      await file.delete();
    }
    
    console.log(`✅ ${files.length} arquivo(s) deletado(s).`);
  } catch (error) {
    console.log('  Erro ao acessar Storage:', error.message);
  }
}

async function main() {
  console.log('🧹 Limpando Firebase do projeto CliniKondo...\n');
  
  try {
    await deleteAllUsers();
    await deleteAllCollections();
    await deleteAllStorageFiles();
    
    console.log('\n🎉 Firebase limpo com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
  
  process.exit(0);
}

main();
