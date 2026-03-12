type Props = {
  name: string;
  picture: string;
};

const Avatar = ({ name, picture }: Props) => {
  return (
    <div className="flex items-center">
      <img src={picture} className="w-12 h-12 rounded-full mr-1" alt={name} />
      <div className="text-xl font-bold text-white">{name}</div>
    </div>
  );
};

export default Avatar;
