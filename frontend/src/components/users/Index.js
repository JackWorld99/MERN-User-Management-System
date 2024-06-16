import Delete from './Delete'
import View from './View'
import Edit from './Edit'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'
import { MdOutlineWifi, MdOutlineWifiOff  } from 'react-icons/md'

const Index = ({ filteredNames }) => {

  return (
    <>
      {filteredNames.map((user, index)=> (
        <tr key={index}>
          <td>{index + 1}</td>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td>{user.roles}</td>
          <td>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" role="switch" checked={user.active} readOnly/>
            </div>
          </td>
          <td>{user.isOnline ? <MdOutlineWifi className='text-success' size={25}/> : <MdOutlineWifiOff className='text-secondary' size={25}/>}</td>
          <td>{formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}</td>
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