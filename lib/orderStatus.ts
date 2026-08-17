export const orderStatusMap: any = {

    registered: {
        title: "ثبت شده",
        color: "gray"
    },


    checking: {
        title: "در حال بررسی",
        color: "blue"
    },


    need_documents: {
        title: "نیاز به مدارک",
        color: "orange"
    },


    processing: {
        title: "در حال انجام",
        color: "purple"
    },


    ready: {
        title: "آماده تحویل",
        color: "green"
    },


    completed: {
        title: "تکمیل شده",
        color: "green"
    },


    cancelled: {
        title: "لغو شده",
        color: "red"
    }

};



export function getOrderStatus(status: string) {

    return (
        orderStatusMap[status]
        ||
        {
            title: status,
            color: "gray"
        }
    );

}