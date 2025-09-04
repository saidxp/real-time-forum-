package db
import(
repo "forum/internal/repository"
"database/sql"

)


func Addmsg(msg string, user_id int)(int ,error){

	var count int

	_, err := repo.DB.Exec(repo.INSERT_IN_TO_CHAT_MSG, user_id,msg)

	if err == sql.ErrNoRows {
		return 0, nil
	} else if err != nil {
		return -1, err
	}
	return count, nil
}