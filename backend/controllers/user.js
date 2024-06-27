const mongoose = require('mongoose')
const validator = require('validator')
const Note = require('../models/Note')
const User = require('../models/user/User')
const ROLES_LIST = require('../config/rolesList')
const bcrypt = require('bcrypt')
const { CustomError } = require('../middleware/errorHandler')
const { validateAuthInputField, validateObjectId } = require('../utils/validation')

exports.getAll = async (req, res, next) => {
    try {
        let users
        
        if(req.roles.includes(ROLES_LIST.Root)){
            users = await User.find().sort({ isOnline: -1, lastActive: -1 }).select('-password').lean()
        }else{
            // const adminItSelf = await User.findById(req.user._id).lean().exec()
            // users = await User.find({$and: [{'roles': {$ne: ROLES_LIST.Root}}, {'roles': {$ne: ROLES_LIST.Admin}}]}).sort({ isOnline: -1, lastActive: 1 }).select('-password').lean()
            // users.unshift(adminItSelf)
            const query = {
                $or: [
                    { roles: ROLES_LIST.User },
                    { _id: req.user._id }
                ],
                roles: { $ne: ROLES_LIST.Root }
            }
            users = await User.find(query).sort({ isOnline: -1, lastActive: -1 }).select('-password').lean()
        }
        
        if (!users?.length) throw new CustomError('No users found', 404)
        res.status(200).json(users)
    } catch (error) {
        next(error)
    }
}

exports.create = async (req, res, next) => {
    try {
        const { name, email, password, roles, active } = req.body

        validateAuthInputField(name, email, password)

        if(roles){if (!Array.isArray(roles) || !roles.length) throw new CustomError('Invalid roles data type received', 400)}
        if(active){if(typeof active !== 'boolean') throw new CustomError('Invalid active data type received', 400)}
    
        const duplicateEmail = await User.findOne({ email }).collation({ locale: 'en', strength: 2 }).lean().exec()
        if(duplicateEmail) throw new CustomError('Email already in use', 409)
    
        const hashedPassword  = await bcrypt.hash(password, 10)
        
        if(roles.includes(ROLES_LIST.Admin)) throw new CustomError('Not authorized to create admin', 400)
    
        const createUser = { name: name.trim(), email: email.trim(), password: { hashed: hashedPassword }, roles: roles ?? [ROLES_LIST.User], active: active ?? true}
        
        const user = await User.create(createUser)
        if(!user) throw new CustomError('Invalid user data received', 400)
    
        res.status(201).json({name: user.name, email, roles: user.roles, active: user.active})
    } catch (error) {
        next(error)
    }
}

exports.update = async (req, res, next) => {
    try {
        const { id, name, email, password, roles, active } = req.body
    
        validateObjectId(id, 'User')
        
        const checkUser = await User.findById(id).exec()
        if (!checkUser) throw new CustomError('User not found', 400)
    
        const updateFields = {}
    
        if(name) { 
            validateAuthInputField(name)
            updateFields.name = name 
        }
    
        if(email){
            validateAuthInputField(email)
            const duplicateEmail = await User.findOne({ email }).collation({ locale: 'en', strength: 2 }).lean().exec()
            if (duplicateEmail && duplicateEmail?._id.toString() !== id) throw new CustomError('Email already in use', 409)
            updateFields.email = email
        }
    
        if(password){
            validateAuthInputField(password)
            const hashedPassword = await bcrypt.hash(password, 10)
            updateFields.password = { hashed: hashedPassword, errorCount: 0}
        }
    
        if(roles){
            if (!Array.isArray(roles) || !roles.length) throw new CustomError('Invalid roles data type received', 400)
            updateFields.roles = roles
        }

        if(typeof active === 'boolean'){
            active ? Object.assign(updateFields, { active: true, password: { hashed: checkUser.password.hashed, errorCount: 0 }, otp: { requests: 0, errorCount: 0 }}) : Object.assign(updateFields, { active: false, isOnline: false})
        }
        
        const rootUser = await User.findById(id).lean().exec()
        if(rootUser.roles.includes(ROLES_LIST.Root)) throw new CustomError('Not authorized to edit this user', 401)
        if(req.roles.includes(ROLES_LIST.Admin) && rootUser.roles.includes(ROLES_LIST.Admin)) throw new CustomError('Not authorized to edit this user', 401)

        const updatedUser = await User.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true }).lean().exec()
        if (!updatedUser) throw new CustomError( 'User not found, something went wrong, during update', 404)
    
        const users = await User.find().sort({ isOnline: -1, lastActive: -1 }).select('-password -otp').lean().exec()
        res.status(200).json(users)
    } catch (error) {
        next(error)
    }
}

exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params
    
        validateObjectId(id, 'User')
    
        const rootUser = await User.findById(id).lean().exec()
        if(rootUser.roles.includes(ROLES_LIST.Root)) throw new CustomError('Not authorized to delete this user', 401)
        if(req.roles.includes(ROLES_LIST.Admin) && rootUser.roles.includes(ROLES_LIST.Admin)) throw new CustomError('Not authorized to delete this user', 401)
            
        const user = await User.findByIdAndDelete(id).lean().exec()
        if (!user) throw new CustomError(400).json('User not found', 404)
    
        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
}

exports.getNotAssignUser = async (req, res, next) => {
    try {
        const { id } = req.params
      
        validateObjectId(id, 'Task')
    
        const notAssign = await User.find({
            tasks: { $ne: id },
            roles: { $nin: [ROLES_LIST.Root, ROLES_LIST.Admin] },
            active: true
        }).select('_id name').lean().exec()
    
        if(!notAssign) throw new CustomError('User not found', 404)

        res.status(200).json(notAssign)
    } catch (error) {
        next(error)
    }
}