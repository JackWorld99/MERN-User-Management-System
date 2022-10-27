import Delete from './Delete'
import View from './View'
import Edit from './Edit'

const Index = ({ users }) => {

  return (
    <>
      {users.map(user => (
        <tr key={user._id}>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td>{user.roles}</td>
          <td>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" role="switch" checked={user.active} readOnly/>
            </div>
          </td>
          <td>
            <View user={user}/>
            <Edit user={user}/>
            <Delete user={user}/>
          </td>
        </tr>
      ))}
    </>
  )
}

export default Index