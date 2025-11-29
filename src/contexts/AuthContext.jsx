import { createContext, useContext, useState, useEffect } from 'react'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Monitorar estado de autenticação (sessão persistente - RF03)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        // Buscar perfil do usuário
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data())
          // Atualizar lastLogin
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            lastLogin: serverTimestamp()
          })
        } else {
          // Criar documento do usuário se não existir (ex: após limpar Firestore)
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Usuário',
            joinedAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            documentCount: 0,
            storageUsedMB: 0,
          }
          await setDoc(doc(db, 'users', firebaseUser.uid), userData)
          setUserProfile(userData)
        }
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Registro de usuário (RF01)
  async function register(email, password, displayName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const { user: newUser } = userCredential

    // Atualizar displayName no Firebase Auth
    await updateProfile(newUser, { displayName })

    // Criar documento do usuário no Firestore
    const userData = {
      uid: newUser.uid,
      email: newUser.email,
      displayName,
      joinedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      documentCount: 0,
      storageUsedMB: 0,
    }

    await setDoc(doc(db, 'users', newUser.uid), userData)
    setUserProfile(userData)

    return newUser
  }

  // Login (RF01)
  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  }

  // Logout
  async function logout() {
    await signOut(auth)
  }

  // Recuperar senha
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email)
  }

  // Atualizar perfil
  async function updateUserProfile(updates) {
    if (!user) return

    await updateDoc(doc(db, 'users', user.uid), {
      ...updates,
      updatedAt: serverTimestamp()
    })

    setUserProfile(prev => ({ ...prev, ...updates }))
  }

  const value = {
    user,
    userProfile,
    loading,
    register,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
